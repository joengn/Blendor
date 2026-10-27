import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, normalizeState, getPlayerView } from '../src/game/state.js';
import { applyCommand, COMMANDS } from '../src/game/commands.js';
const match = () => createMatch(['A', 'B'], { seed: 'repeatable-test' });
function command(state, type, payload = {}, actorId = state.players[state.current].id) {
  return { id: crypto.randomUUID(), actorId, expectedRevision: state.revision, type, payload };
}
const apply = (state, c) => applyCommand(state, c, { authenticatedPlayerId: c.actorId });
test('seeded matches produce identical decks and stable player identities', () => {
  assert.deepEqual(match(), match());
  assert.deepEqual(
    match().players.map((p) => p.id),
    ['player-1', 'player-2'],
  );
});
test('commands are immutable and failed commands cannot partially spend tokens', () => {
  const state = match(),
    before = structuredClone(state),
    c = command(state, COMMANDS.TAKE_GEMS, { tokens: [1, 1, 1, 0, 0] });
  const next = apply(state, c);
  assert.deepEqual(state, before);
  assert.equal(next.revision, 1);
  assert.equal(next.players[0].tokens[0], 1);
  assert.throws(() =>
    apply(state, command(state, COMMANDS.BUY_CARD, { cardId: state.market[2][0].id })),
  );
  assert.deepEqual(state, before);
});
test('rejects a different authenticated player and an out-of-turn actor', () => {
  const state = match(),
    c = command(state, COMMANDS.TAKE_GEMS, { tokens: [1, 1, 1, 0, 0] });
  assert.throws(() => applyCommand(state, c, { authenticatedPlayerId: 'player-2' }), /identity/);
  assert.throws(() => apply(state, { ...c, actorId: 'player-2' }), /not your turn/);
});
test('rejects a stale revision and handles a repeated command idempotently', () => {
  const state = match(),
    c = command(state, COMMANDS.TAKE_GEMS, { tokens: [1, 1, 1, 0, 0] }),
    next = apply(state, c);
  assert.deepEqual(apply(next, c), next);
  assert.throws(() => apply(next, { ...command(state, COMMANDS.END_TURN) }), /game changed/);
});
test('reservation, gold payment, and end turn use the same command path', () => {
  let state = match();
  state = apply(state, command(state, COMMANDS.RESERVE_CARD, { cardId: state.market[0][0].id }));
  assert.equal(state.players[0].reserved.length, 1);
  assert.equal(state.players[0].tokens[5], 1);
  state = apply(state, command(state, COMMANDS.END_TURN));
  assert.equal(state.current, 1);
  assert.equal(state.revision, 2);
});
test('player views hide deck order, random seed and opponents reserved card details', () => {
  let state = match();
  state = apply(state, command(state, COMMANDS.RESERVE_CARD, { level: 0 }));
  const owner = getPlayerView(state, 'player-1'),
    other = getPlayerView(state, 'player-2');
  assert.equal(owner.players[0].reserved[0].id, state.players[0].reserved[0].id);
  assert.deepEqual(other.players[0].reserved, [{ hidden: true }]);
  assert.equal(other.decks[0].length, state.decks[0].length);
  assert.ok(other.decks.flat().every((c) => c === null));
  assert.equal(other.seed, undefined);
  assert.equal(other.appliedCommands, undefined);
  assert.ok(state.decks[0][0].id);
});
test('legacy saves gain stable IDs and revision metadata without losing the game', () => {
  const state = match();
  delete state.revision;
  delete state.appliedCommands;
  state.players.forEach((p) => {
    delete p.id;
    delete p.seat;
  });
  const restored = normalizeState(state);
  assert.equal(restored.revision, 0);
  assert.equal(restored.players[1].id, 'player-2');
  assert.deepEqual(restored.market, state.market);
  assert.throws(() => normalizeState({ version: 1 }));
});
