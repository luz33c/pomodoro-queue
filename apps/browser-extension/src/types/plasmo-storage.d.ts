declare module '@plasmohq/storage' {
  export type ChromeStorageArea = 'local' | 'sync' | 'managed';
  export type StorageOptions = {
    area?: ChromeStorageArea;
  };
  export class Storage {
    constructor(options?: StorageOptions);
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
    clear(key?: string): Promise<void>;
    watch?(
      keys: Record<string, boolean>,
      cb: (
        changes: Record<string, { newValue: unknown; oldValue: unknown }>
      ) => void
    ): Promise<() => void>;
  }
}

declare module '@plasmohq/storage/hook' {
  import type { Storage } from '@plasmohq/storage';
  export type UseStorageOptions = { instance?: Storage };
  export function useStorage<T>(
    key: string,
    initial?: T | (() => T),
    options?: UseStorageOptions
  ): [T, (value: T) => Promise<void>, boolean];
}
