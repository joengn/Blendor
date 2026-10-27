// Add URL mappings here once final artwork arrives. Paths resolve from this module.
export const ARTWORK = { cards: {}, nobles: {}, gems: {} };
export function artworkUrl(kind, id) {
  const path = ARTWORK[kind]?.[id];
  return path ? new URL(path, import.meta.url).href : null;
}
