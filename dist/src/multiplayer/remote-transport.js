/**
 * Injectable network boundary. request(command) returns an authoritative player-view snapshot;
 * subscribeToSnapshots(listener) forwards server pushes and returns an unsubscribe function.
 * This adapter does not create rooms, authenticate users, or operate a server.
 */
export function createRemoteTransport({ initialSnapshot, request, subscribeToSnapshots }) {
  if (!initialSnapshot || typeof request !== 'function')
    throw new Error('Provide an initial server snapshot and a request function.');
  let state = structuredClone(initialSnapshot);
  const listeners = new Set();
  function receive(next) {
    if (!next || !Number.isInteger(next.revision)) throw new Error('Invalid server snapshot.');
    if (next.revision < state.revision) return;
    state = structuredClone(next);
    for (const listener of listeners) listener(structuredClone(state));
  }
  const unsubscribe = subscribeToSnapshots?.(receive);
  return {
    mode: 'online',
    canUndo: false,
    canStart: false,
    getSnapshot: () => structuredClone(state),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async send(command) {
      const next = await request(command);
      receive(next);
      return structuredClone(state);
    },
    dispose() {
      unsubscribe?.();
      listeners.clear();
    },
  };
}
