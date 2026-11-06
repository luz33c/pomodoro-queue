import { useEffect } from "react";

/** Opens the server's change stream for the signed-in user; each message means "refetch". */
export type SubscribeChanges = (signal: AbortSignal) => Promise<AsyncIterable<unknown>>;

/** The part of an account collection the stream drives. */
export type RefetchableCollection = { utils: { refetch: () => Promise<unknown> } };

const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 30_000;

type Follower = { controller: AbortController; readers: number };

const followers = new Map<RefetchableCollection, Follower>();

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}

/**
 * Follows the stream until aborted. Each connect refetches once to pick up changes made while it was
 * down, then every message refetches. A dropped stream (offline, asleep, server restart) reconnects
 * after 1, 2, 4… up to 30 seconds; nothing runs on a timer while connected.
 */
async function follow(
  collection: RefetchableCollection,
  subscribe: SubscribeChanges,
  signal: AbortSignal
) {
  let attempt = 0;

  while (!signal.aborted) {
    try {
      const changes = await subscribe(signal);
      attempt = 0;
      await collection.utils.refetch();
      for await (const _change of changes) {
        await collection.utils.refetch();
      }
    } catch {
      // The stream failed or ended; the loop reconnects unless the reader went away
    }

    if (signal.aborted) {
      return;
    }
    await wait(Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS), signal);
    attempt += 1;
  }
}

/** One stream per collection however many components read it; the last reader closes it. */
function retain(collection: RefetchableCollection, subscribe: SubscribeChanges) {
  let follower = followers.get(collection);
  if (!follower) {
    const controller = new AbortController();
    follower = { controller, readers: 0 };
    followers.set(collection, follower);
    void follow(collection, subscribe, controller.signal);
  }
  follower.readers += 1;

  const current = follower;
  return () => {
    current.readers -= 1;
    if (current.readers === 0) {
      current.controller.abort();
      followers.delete(collection);
    }
  };
}

/** Keeps an account collection current from the server's change stream while a component shows it. */
export function useLiveChanges(
  collection: RefetchableCollection | null,
  subscribe: SubscribeChanges
) {
  useEffect(
    () => (collection ? retain(collection, subscribe) : undefined),
    [collection, subscribe]
  );
}
