import { createMatch, normalizeState } from '../game/state.js';
import { applyCommand, PRIMARY_ACTIONS } from '../game/commands.js';

export function createLocalTransport({
  playerNames,
  storage,
  initialState,
  onStorageError = () => {},
}) {
  let state,
    checkpoint = null,
    redoState = null;
  const listeners = new Set();
  try {
    state = normalizeState(initialState ?? storage?.read());
  } catch {
    state = createMatch(playerNames);
  }
  const snapshot = () => structuredClone(state);
  function publish() {
    try {
      storage?.write(state);
    } catch (error) {
      onStorageError(error);
    }
    for (const listener of listeners) listener(snapshot());
    return snapshot();
  }
  return {
    mode: 'local',
    get canUndo() {
      return checkpoint !== null;
    },
    get canRedo() {
      return redoState !== null;
    },
    canEditNames: true,
    canStart: true,
    getSnapshot: snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async send(command) {
      const next = applyCommand(state, command, { authenticatedPlayerId: command.actorId });
      if (next.revision === state.revision) return snapshot();
      if (PRIMARY_ACTIONS.has(command.type)) checkpoint = snapshot();
      redoState = null;
      state = next;
      return publish();
    },
    async start(names) {
      state = createMatch(names);
      checkpoint = null;
      redoState = null;
      return publish();
    },
    async updateNames(names) {
      if (
        !Array.isArray(names) ||
        names.length !== state.players.length ||
        names.some((name) => typeof name !== 'string' || !name.trim() || name.trim().length > 40)
      )
        throw new Error('Enter a name of 1–40 characters for each current player.');
      const rename = (match) => {
        if (!match) return;
        match.players.forEach((player, seat) => {
          player.name = names[seat].trim();
        });
      };
      rename(state);
      rename(checkpoint);
      rename(redoState);
      state.revision += 1;
      return publish();
    },
    async redo() {
      if (!redoState) throw new Error('There is no local action to redo.');
      checkpoint = snapshot();
      state = redoState;
      redoState = null;
      return publish();
    },
    async undo() {
      if (!checkpoint) throw new Error('There is no local action to undo.');
      redoState = snapshot();
      state = checkpoint;
      checkpoint = null;
      return publish();
    },
  };
}
