type UserScopedCollection = {
  cleanup: () => Promise<void>;
};

const collections = new Set<UserScopedCollection>();

/** Cloud collections hold one user's rows. They register here so a user change drops those rows. */
export function registerUserScopedCollection(collection: UserScopedCollection) {
  collections.add(collection);
}

/** The next subscriber to each collection syncs again with the new user's token. */
export async function resetUserScopedCollections() {
  await Promise.all([...collections].map((collection) => collection.cleanup()));
}
