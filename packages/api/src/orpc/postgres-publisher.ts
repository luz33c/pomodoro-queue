// Port of the Postgres adapter written for middleapi/orpc (packages/publisher/src/adapters/postgres.ts
// on branch feat/publisher-postgres, based on v2.0.0-beta.50; upstream commit: not yet committed).
// Keep the logic and the NOTIFY message format identical, so instances running this file and
// instances running the released adapter understand each other during a rolling deploy.
// Delete this file once @orpc/publisher/postgres ships. Differences from upstream:
// - imports: public exports of @orpc/client instead of @orpc/shared and @standard-server/core,
//   and `once` inlined below
// - the client type is PgClient from @uni-stack/db, so packages/api needs no postgres dependency
// - fields are assigned in the constructor: Node's type stripping, which runs apps/server in dev,
//   rejects parameter properties
import {
  type EventMeta,
  type RPCJsonSerialization,
  RPCJsonSerializer,
  unwrapEvent,
  withEventMeta
} from "@orpc/client";
import {
  Publisher,
  type PublisherOptions,
  type PublisherSubscribeListenerOptions
} from "@orpc/publisher";

import { type PgClient } from "@uni-stack/db";

// Postgres rejects NOTIFY payloads of 8000 bytes or more in its default configuration
const MAX_PAYLOAD_BYTES = 7999;

// Postgres truncates longer identifiers, so LISTEN would use another channel than NOTIFY
const MAX_CHANNEL_BYTES = 63;

type Serializer = Pick<RPCJsonSerializer, keyof RPCJsonSerializer>;

type ThrowableError = Parameters<NonNullable<PublisherSubscribeListenerOptions["onError"]>>[0];

export type PostgresPublisherOptions = PublisherOptions & {
  /**
   * The LISTEN/NOTIFY channel that carries the events. Publishers on the same channel exchange
   * events, so give each app its own channel when several share one database.
   *
   * @default "orpc_publisher"
   */
  channel?: string | undefined;
  /**
   * The prefix to add to event names.
   *
   * @default ""
   */
  prefix?: string | undefined;
  /**
   * Serializer for serialize and deserialize payloads.
   *
   * @default RPCJsonSerializer
   */
  serializer?: Serializer | undefined;
};

type SerializedEvent = {
  payload: RPCJsonSerialization;
  meta?: EventMeta | undefined;
};

type Subscription = {
  deliver: (data: SerializedEvent) => void;
  onError: ((error: ThrowableError) => void) | undefined;
};

type ChannelState = {
  // Subscriptions by prefixed event name
  subscriptions: Map<string, Set<Subscription>>;
  listening: Promise<unknown> | undefined;
  listened: boolean;
};

// Listen state per client and channel, so publishers sharing a client and channel, such as
// those created by prefix(), use a single LISTEN
const channelStates = new WeakMap<object, Map<string, ChannelState>>();

const textEncoder = new TextEncoder();

/**
 * Relays events between server instances through LISTEN/NOTIFY on a single Postgres channel.
 *
 * Delivery is at most once: a reconnect of the listen connection is reported through `onError`,
 * since events published while it was down are lost. The client keeps a dedicated listen
 * connection open until `sql.end()`, so it must connect directly or through a session-mode pooler.
 */
export class PostgresPublisher<T extends Record<string, object>> extends Publisher<T> {
  private readonly sql: PgClient;
  private readonly options: PostgresPublisherOptions;
  private readonly channel: string;
  private readonly eventPrefix: string;
  private readonly serializer: Serializer;
  private readonly state: ChannelState;

  constructor(sql: PgClient, options: PostgresPublisherOptions = {}) {
    super(options);

    this.sql = sql;
    this.options = options;
    this.channel = options.channel ?? "orpc_publisher";
    this.eventPrefix = options.prefix ?? "";
    this.serializer = options.serializer ?? new RPCJsonSerializer();

    if (textEncoder.encode(this.channel).length > MAX_CHANNEL_BYTES) {
      throw new TypeError(
        `PostgresPublisher channel "${this.channel}" exceeds the ${MAX_CHANNEL_BYTES}-byte identifier limit of Postgres.`
      );
    }

    let states = channelStates.get(sql);
    if (!states) {
      states = new Map();
      channelStates.set(sql, states);
    }

    let state = states.get(this.channel);
    if (!state) {
      state = { subscriptions: new Map(), listening: undefined, listened: false };
      states.set(this.channel, state);
    }

    this.state = state;
  }

  /**
   * Creates a publisher with `prefix` appended to this publisher's prefix, sharing its client and
   * listen connection.
   */
  prefix(prefix: string): PostgresPublisher<T> {
    return new PostgresPublisher(this.sql, {
      ...this.options,
      prefix: `${this.eventPrefix}${prefix}`
    });
  }

  async publish<K extends keyof T & string>(event: K, payload: T[K]): Promise<void> {
    const [original, meta] = unwrapEvent(payload);
    const { json, meta: jsonMeta } = this.serializer.serializeJson(original);
    const data: SerializedEvent = { payload: { json, meta: jsonMeta }, meta };
    const message = JSON.stringify({ event: `${this.eventPrefix}${event}`, data });

    if (textEncoder.encode(message).length > MAX_PAYLOAD_BYTES) {
      throw new TypeError(
        `PostgresPublisher event "${event}" exceeds the ${MAX_PAYLOAD_BYTES + 1}-byte NOTIFY payload limit of Postgres.`
      );
    }

    await this.sql.notify(this.channel, message);
  }

  protected async subscribeListener<K extends keyof T & string>(
    event: K,
    listener: (payload: T[K]) => void,
    { onError }: PublisherSubscribeListenerOptions = {}
  ): Promise<() => Promise<void>> {
    const name = `${this.eventPrefix}${event}`;
    const { subscriptions } = this.state;

    const subscription: Subscription = {
      deliver: (data) => {
        try {
          listener(this.deserializePayload(data) as T[K]);
        } catch (error) {
          onError?.(error as ThrowableError);
        }
      },
      onError
    };

    let eventSubscriptions = subscriptions.get(name);
    if (!eventSubscriptions) {
      eventSubscriptions = new Set();
      subscriptions.set(name, eventSubscriptions);
    }

    eventSubscriptions.add(subscription);

    const unsubscribe = once(async () => {
      const current = subscriptions.get(name);

      if (current?.delete(subscription) && current.size === 0) {
        subscriptions.delete(name);
      }
    });

    try {
      await this.listen();
    } catch (error) {
      await unsubscribe();
      throw error;
    }

    return unsubscribe;
  }

  /**
   * Starts the single LISTEN of this client and channel, retrying on the next call if it fails.
   *
   * It stays for the lifetime of the client rather than ending with the last subscription:
   * postgres 3.x registers listeners again after a reconnect without updating the `unlisten`
   * it returned, so unlistening could leave a listener behind and deliver events twice.
   */
  private listen(): Promise<unknown> {
    const state = this.state;

    state.listening ??= this.sql
      .listen(
        this.channel,
        (raw) => dispatch(state, raw),
        () => {
          // postgres calls this after the first LISTEN and again after every reconnect
          if (!state.listened) {
            state.listened = true;
            return;
          }

          forEachSubscription(state, (subscription) =>
            subscription.onError?.(
              new Error(
                `PostgresPublisher reconnected to channel "${this.channel}", events published while it was disconnected were lost.`
              )
            )
          );
        }
      )
      .catch((error: unknown) => {
        state.listening = undefined;
        throw error;
      });

    return state.listening;
  }

  private deserializePayload({ payload, meta }: SerializedEvent): object {
    return withEventMeta(this.serializer.deserializeJson(payload) as object, { ...meta });
  }
}

function dispatch(state: ChannelState, raw: string): void {
  let message: { event: string; data: SerializedEvent };

  try {
    // parseEmptyableJSON upstream: an empty payload parses to undefined
    message = (raw ? JSON.parse(raw) : undefined) as typeof message;

    if (typeof message?.event !== "string") {
      throw new TypeError("PostgresPublisher received a notification without an event name.");
    }
  } catch (error) {
    // Without an event name, every subscription on the channel may have missed an event
    forEachSubscription(state, (subscription) => subscription.onError?.(error as ThrowableError));
    return;
  }

  const subscriptions = state.subscriptions.get(message.event);

  if (subscriptions) {
    // Snapshot, since a listener may unsubscribe itself mid-dispatch
    Array.from(subscriptions).forEach((subscription) => subscription.deliver(message.data));
  }
}

function forEachSubscription(state: ChannelState, fn: (subscription: Subscription) => void): void {
  Array.from(state.subscriptions.values())
    .flatMap((subscriptions) => Array.from(subscriptions))
    .forEach(fn);
}

// once from @orpc/shared: runs fn on the first call and returns that result on every call
function once<T>(fn: () => T): () => T {
  let cached: { result: T } | undefined;

  return () => {
    cached ??= { result: fn() };
    return cached.result;
  };
}
