/** The UI sends commands through this client, never directly mutating the engine state. */
export function createGameClient({ transport, actorId }) {
  let pending = false;
  return {
    get mode() {
      return transport.mode;
    },
    get canUndo() {
      return transport.canUndo && !pending;
    },
    get canRedo() {
      return !!transport.canRedo && !pending;
    },
    get canEditNames() {
      return !!transport.canEditNames && !pending;
    },
    get canStart() {
      return transport.canStart;
    },
    get canAct() {
      const state = transport.getSnapshot();
      return !pending && !state.over && (!actorId || state.players[state.current].id === actorId);
    },
    getSnapshot: () => transport.getSnapshot(),
    subscribe: (listener) => transport.subscribe(listener),
    async dispatch(type, payload = {}) {
      if (pending) throw new Error('Wait for the current action to finish.');
      const state = transport.getSnapshot();
      pending = true;
      try {
        return await transport.send({
          id: globalThis.crypto.randomUUID(),
          actorId: actorId ?? state.players[state.current].id,
          expectedRevision: state.revision,
          type,
          payload: structuredClone(payload),
        });
      } finally {
        pending = false;
      }
    },
    async start(names) {
      if (!transport.canStart) throw new Error('Create a new room through your online server.');
      return transport.start(names);
    },
    async updateNames(names) {
      if (!transport.canEditNames) throw new Error('Edit online names through the room service.');
      return transport.updateNames(names);
    },
    async redo() {
      if (!transport.canRedo) throw new Error('There is no local action to redo.');
      return transport.redo();
    },
    async undo() {
      if (!transport.canUndo) throw new Error('Undo is available for local play only.');
      return transport.undo();
    },
    dispose() {
      transport.dispose?.();
    },
  };
}
