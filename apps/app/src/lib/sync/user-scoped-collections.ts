type UserScopedCollection = {
  cleanup: () => Promise<void>;
};

const collections = new Set<UserScopedCollection>();

/** Account collections hold one user's rows. They register here so a user change drops those rows. */
export function registerUserScopedCollection(collection: UserScopedCollection) {
  collections.add(collection);
}

/**
 * The next subscriber to each collection syncs again with the new user's token. A collection a page
 * still reads refuses cleanup; it belongs to the previous user and is unmounting, so that is ignored.
 */
export async function resetUserScopedCollections() {
  await Promise.allSettled([...collections].map((collection) => collection.cleanup()));
}
