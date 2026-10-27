/** Read the renamed save key, with a non-destructive fallback to older app names. */
export function browserStorage(key, storage, { legacyKeys = [] } = {}) {
  // Resolve localStorage lazily: restricted browsers can throw even when accessing it.
  const getStorage = () => storage ?? globalThis.localStorage;
  return {
    read() {
      const target = getStorage();
      let value = target.getItem(key);
      if (value === null) {
        for (const legacyKey of legacyKeys) {
          value = target.getItem(legacyKey);
          if (value !== null) break;
        }
      }
      return value ? JSON.parse(value) : null;
    },
    write(state) {
      getStorage().setItem(key, JSON.stringify(state));
    },
  };
}
