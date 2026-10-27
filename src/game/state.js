import { newGame } from './engine.js';
import { seededRandom } from './random.js';

export function createMatch(names, { seed = globalThis.crypto.randomUUID() } = {}) {
  return { ...newGame(names, { random: seededRandom(seed) }), seed };
}

export function normalizeState(saved) {
  if (
    !saved ||
    saved.version !== 1 ||
    !Array.isArray(saved.players) ||
    saved.players.length < 2 ||
    saved.players.length > 4 ||
    saved.bank?.length !== 6 ||
    saved.market?.length !== 3 ||
    saved.decks?.length !== 3 ||
    !Number.isInteger(saved.current) ||
    saved.current < 0 ||
    saved.current >= saved.players.length ||
    !saved.players.every(
      (p) =>
        p.tokens?.length === 6 &&
        p.bonuses?.length === 5 &&
        Array.isArray(p.cards) &&
        Array.isArray(p.reserved) &&
        Array.isArray(p.nobles),
    )
  ) {
    throw new Error('Unsupported or invalid saved game.');
  }
  const state = structuredClone(saved);
  state.revision ??= 0;
  state.appliedCommands ??= [];
  state.players.forEach((p, seat) => {
    p.id ??= `player-${seat + 1}`;
    p.seat = seat;
  });
  return state;
}

// Server-side projection: deck order and other players' reserved cards never cross the wire.
// Null deck entries preserve the current UI's deck-count contract without exposing cards.
export function getPlayerView(state, viewerId) {
  const view = structuredClone(state);
  delete view.seed;
  delete view.appliedCommands;
  view.decks = state.decks.map((deck) => deck.map(() => null));
  view.players = state.players.map((p) => ({
    ...structuredClone(p),
    reserved:
      p.id === viewerId ? structuredClone(p.reserved) : p.reserved.map(() => ({ hidden: true })),
  }));
  return view;
}
