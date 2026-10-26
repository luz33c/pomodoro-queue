import { Database, type SQLQueryBindings } from "bun:sqlite";
// Adapted from @tanstack/node-db-sqlite-persistence 0.2.37 (MIT, TanStack): better-sqlite3 is a native
// Node addon, so the Electrobun main process uses Bun's built-in SQLite with the same queueing and
// savepoint semantics.
import { AsyncLocalStorage } from "node:async_hooks";

import {
  InvalidPersistedCollectionConfigError,
  type SQLiteDriver
} from "@tanstack/db-sqlite-persistence-core";

const DEFAULT_PRAGMAS = [
  "journal_mode = WAL",
  "synchronous = NORMAL",
  "foreign_keys = ON"
] as const;

const INVALID_PRAGMA_PATTERN = /(;|--|\/\*)/;

type ExistingDatabaseOptions = {
  database: Database;
  pragmas?: ReadonlyArray<string>;
};

type OpenFileOptions = {
  filename: string;
  pragmas?: ReadonlyArray<string>;
};

export type BunSQLiteDriverOptions = ExistingDatabaseOptions | OpenFileOptions;

type TransactionContext = {
  depth: number;
};

type DatabaseExecutionState = {
  transactionContext: AsyncLocalStorage<TransactionContext>;
  queue: Promise<void>;
  nextSavepointId: number;
};

// One queue per database, shared by every driver that wraps it, so writes never interleave.
const databaseExecutionStates = new WeakMap<Database, DatabaseExecutionState>();

function getDatabaseExecutionState(database: Database): DatabaseExecutionState {
  const existing = databaseExecutionStates.get(database);
  if (existing) {
    return existing;
  }

  const state: DatabaseExecutionState = {
    transactionContext: new AsyncLocalStorage<TransactionContext>(),
    queue: Promise.resolve(),
    nextSavepointId: 1
  };
  databaseExecutionStates.set(database, state);
  return state;
}

function assertTransactionCallbackHasDriverArg(
  fn: (transactionDriver: SQLiteDriver) => Promise<unknown>
): void {
  if (fn.length > 0) {
    return;
  }

  throw new InvalidPersistedCollectionConfigError(
    "SQLiteDriver.transaction callback must accept the transaction driver argument"
  );
}

function hasExistingDatabase(options: BunSQLiteDriverOptions): options is ExistingDatabaseOptions {
  return "database" in options;
}

function toBindings(params: ReadonlyArray<unknown>): SQLQueryBindings[] {
  return params as SQLQueryBindings[];
}

export class BunSQLiteDriver implements SQLiteDriver {
  private readonly database: Database;
  private readonly ownsDatabase: boolean;
  private readonly executionState: DatabaseExecutionState;

  constructor(options: BunSQLiteDriverOptions) {
    if (hasExistingDatabase(options)) {
      this.database = options.database;
      this.ownsDatabase = false;
      this.executionState = getDatabaseExecutionState(this.database);
      this.applyPragmas(options.pragmas ?? DEFAULT_PRAGMAS);
      return;
    }

    if (options.filename.trim().length === 0) {
      throw new InvalidPersistedCollectionConfigError("Bun SQLite driver filename cannot be empty");
    }

    this.database = new Database(options.filename, { create: true });
    this.ownsDatabase = true;
    this.executionState = getDatabaseExecutionState(this.database);
    this.applyPragmas(options.pragmas ?? DEFAULT_PRAGMAS);
  }

  async exec(sql: string): Promise<void> {
    if (this.isInsideTransaction()) {
      this.database.exec(sql);
      return;
    }

    await this.enqueue(() => {
      this.database.exec(sql);
    });
  }

  async query<T>(sql: string, params: ReadonlyArray<unknown> = []): Promise<ReadonlyArray<T>> {
    if (this.isInsideTransaction()) {
      return this.executeQuery<T>(sql, params);
    }

    return this.enqueue(() => this.executeQuery<T>(sql, params));
  }

  async run(sql: string, params: ReadonlyArray<unknown> = []): Promise<void> {
    if (this.isInsideTransaction()) {
      this.executeRun(sql, params);
      return;
    }

    await this.enqueue(() => {
      this.executeRun(sql, params);
    });
  }

  async transaction<T>(fn: (transactionDriver: SQLiteDriver) => Promise<T>): Promise<T> {
    assertTransactionCallbackHasDriverArg(fn);

    if (this.isInsideTransaction()) {
      return this.runNestedTransaction(fn);
    }

    return this.enqueue(async () => {
      this.database.exec("BEGIN IMMEDIATE");
      try {
        const result = await this.executionState.transactionContext.run({ depth: 1 }, async () =>
          fn(this)
        );
        this.database.exec("COMMIT");
        return result;
      } catch (error) {
        try {
          this.database.exec("ROLLBACK");
        } catch {
          // Keep the original transaction error as the primary failure.
        }
        throw error;
      }
    });
  }

  async transactionWithDriver<T>(fn: (transactionDriver: SQLiteDriver) => Promise<T>): Promise<T> {
    return this.transaction(fn);
  }

  close(): void {
    if (!this.ownsDatabase) {
      return;
    }

    this.database.close();
  }

  getDatabase(): Database {
    return this.database;
  }

  private applyPragmas(pragmas: ReadonlyArray<string>): void {
    for (const pragma of pragmas) {
      const trimmedPragma = pragma.trim();
      if (trimmedPragma.length === 0) {
        continue;
      }

      if (INVALID_PRAGMA_PATTERN.test(trimmedPragma)) {
        throw new InvalidPersistedCollectionConfigError(`Invalid SQLite PRAGMA: "${pragma}"`);
      }

      this.database.exec(`PRAGMA ${trimmedPragma}`);
    }
  }

  private isInsideTransaction(): boolean {
    return this.executionState.transactionContext.getStore() !== undefined;
  }

  private executeQuery<T>(sql: string, params: ReadonlyArray<unknown>): ReadonlyArray<T> {
    return this.database.query(sql).all(...toBindings(params)) as ReadonlyArray<T>;
  }

  private executeRun(sql: string, params: ReadonlyArray<unknown>): void {
    this.database.query(sql).run(...toBindings(params));
  }

  private enqueue<T>(operation: () => Promise<T> | T): Promise<T> {
    const queuedOperation = this.executionState.queue.then(operation, operation);
    this.executionState.queue = queuedOperation.then(
      () => undefined,
      () => undefined
    );
    return queuedOperation;
  }

  private async runNestedTransaction<T>(
    fn: (transactionDriver: SQLiteDriver) => Promise<T>
  ): Promise<T> {
    const context = this.executionState.transactionContext.getStore();
    if (!context) {
      return fn(this);
    }

    const savepointName = `tsdb_sp_${this.executionState.nextSavepointId}`;
    this.executionState.nextSavepointId++;
    this.database.exec(`SAVEPOINT ${savepointName}`);

    try {
      const result = await this.executionState.transactionContext.run(
        { depth: context.depth + 1 },
        async () => fn(this)
      );
      this.database.exec(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (error) {
      this.database.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      this.database.exec(`RELEASE SAVEPOINT ${savepointName}`);
      throw error;
    }
  }
}
