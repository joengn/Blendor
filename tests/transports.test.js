import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalTransport } from '../src/multiplayer/local-transport.js';
import { createRemoteTransport } from '../src/multiplayer/remote-transport.js';
import { createGameClient } from '../src/multiplayer/client.js';
import { createMatch } from '../src/game/state.js';
import { applyCommand, COMMANDS } from '../src/game/commands.js';
const local = (options) =>
  createLocalTransport({
    playerNames: ['A', 'B'],
    initialState: createMatch(['A', 'B'], { seed: 'transport' }),
    ...options,
  });
test('two clients observe one authoritative local state and enforce turn ownership', async () => {
  const transport = local(),
    a = createGameClient({ transport, actorId: 'player-1' }),
    b = createGameClient({ transport, actorId: 'player-2' });
  let observed = 0;
  const unsubscribe = b.subscribe(() => observed++);
  await a.dispatch(COMMANDS.TAKE_GEMS, { tokens: [1, 1, 1, 0, 0] });
  assert.equal(b.getSnapshot().revision, 1);
  await assert.rejects(b.dispatch(COMMANDS.END_TURN), /not your turn/);
  await a.dispatch(COMMANDS.END_TURN);
  assert.equal(b.canAct, true);
  assert.equal(a.canAct, false);
  assert.equal(observed, 2);
  unsubscribe();
});
test('undo restores the whole local action including its turn transition', async () => {
  let saved;
  const t = local({ storage: { write: (state) => (saved = structuredClone(state)) } }),
    client = createGameClient({ transport: t });
  const before = client.getSnapshot();
  await client.dispatch(COMMANDS.TAKE_GEMS, { tokens: [2, 0, 0, 0, 0] });
  await client.dispatch(COMMANDS.END_TURN);
  assert.equal(client.canUndo, true);
  await client.undo();
  assert.deepEqual(client.getSnapshot(), before);
  assert.deepEqual(saved, before);
  assert.equal(client.canUndo, false);
});
test('remote adapter accepts async replies and server pushes, ignoring older snapshots', async () => {
  let server = createMatch(['A', 'B'], { seed: 'network' }),
    push,
    disconnected = false;
  const transport = createRemoteTransport({
    initialSnapshot: server,
    request: async (command) => {
      server = applyCommand(server, command, { authenticatedPlayerId: 'player-1' });
      return server;
    },
    subscribeToSnapshots: (listener) => {
      push = listener;
      return () => (disconnected = true);
    },
  });
  const client = createGameClient({ transport, actorId: 'player-1' }),
    original = client.getSnapshot();
  await client.dispatch(COMMANDS.TAKE_GEMS, { tokens: [1, 1, 1, 0, 0] });
  push(original);
  assert.equal(client.getSnapshot().revision, 1);
  await client.dispatch(COMMANDS.END_TURN);
  assert.equal(client.getSnapshot().current, 1);
  assert.equal(client.canAct, false);
  assert.equal(client.canUndo, false);
  await assert.rejects(client.undo(), /local play only/);
  client.dispose();
  assert.equal(disconnected, true);
});
test('client prevents duplicate actions while a network request is pending', async () => {
  let complete;
  const state = createMatch(['A', 'B'], { seed: 'pending' }),
    transport = createRemoteTransport({
      initialSnapshot: state,
      request: (command) =>
        new Promise((resolve) => {
          complete = () =>
            resolve(applyCommand(state, command, { authenticatedPlayerId: 'player-1' }));
        }),
    });
  const client = createGameClient({ transport, actorId: 'player-1' });
  const pending = client.dispatch(COMMANDS.TAKE_GEMS, { tokens: [1, 1, 1, 0, 0] });
  await assert.rejects(client.dispatch(COMMANDS.TAKE_GEMS, { tokens: [1, 1, 1, 0, 0] }), /Wait/);
  complete();
  await pending;
  assert.equal(client.getSnapshot().revision, 1);
});
test('local saves load through storage and subscribers receive detached snapshots', async () => {
  let saved = createMatch(['A', 'B'], { seed: 'saved' });
  const transport = createLocalTransport({
      playerNames: ['A', 'B'],
      storage: { read: () => saved, write: (state) => (saved = state) },
    }),
    client = createGameClient({ transport });
  client.subscribe((state) => (state.players[0].name = 'Changed outside the store'));
  await client.dispatch(COMMANDS.TAKE_GEMS, { tokens: [1, 1, 1, 0, 0] });
  assert.equal(client.getSnapshot().players[0].name, 'A');
  assert.equal(saved.revision, 1);
});

test('redo restores a full turn exactly and a different action clears redo', async () => {
  const client = createGameClient({ transport: local() });
  const before = client.getSnapshot();
  await client.dispatch(COMMANDS.TAKE_GEMS, { tokens: [2, 0, 0, 0, 0] });
  await client.dispatch(COMMANDS.END_TURN);
  const after = client.getSnapshot();
  await client.undo();
  assert.deepEqual(client.getSnapshot(), before);
  assert.equal(client.canRedo, true);
  await client.redo();
  assert.deepEqual(client.getSnapshot(), after);
  assert.equal(client.canUndo, true);
  assert.equal(client.canRedo, false);
  await client.undo();
  await client.dispatch(COMMANDS.TAKE_GEMS, { tokens: [0, 2, 0, 0, 0] });
  assert.equal(client.canRedo, false);
  await assert.rejects(client.redo(), /no local action/);
});

test('saving names preserves the match, survives reload, and remains through undo/redo', async () => {
  let saved;
  const transport = local({
    storage: {
      write: (state) => {
        saved = structuredClone(state);
      },
    },
  });
  const client = createGameClient({ transport });
  await client.dispatch(COMMANDS.TAKE_GEMS, { tokens: [2, 0, 0, 0, 0] });
  await client.dispatch(COMMANDS.END_TURN);
  const before = client.getSnapshot();
  await client.updateNames([' Alice ', 'Bob']);
  const after = client.getSnapshot();
  assert.deepEqual(
    after.players.map((p) => p.name),
    ['Alice', 'Bob'],
  );
  assert.deepEqual(after.bank, before.bank);
  assert.deepEqual(after.market, before.market);
  assert.equal(after.current, before.current);
  assert.equal(after.turn, before.turn);
  assert.equal(after.revision, before.revision + 1);
  const reloaded = createLocalTransport({
    playerNames: ['X', 'Y'],
    storage: { read: () => saved },
  });
  assert.equal(reloaded.getSnapshot().players[0].name, 'Alice');
  await client.undo();
  await client.updateNames(['Carol', 'Dan']);
  await client.redo();
  assert.deepEqual(
    client.getSnapshot().players.map((p) => p.name),
    ['Carol', 'Dan'],
  );
  await assert.rejects(client.updateNames(['']), /Enter a name/);
  await client.start(['E', 'F']);
  assert.equal(client.canRedo, false);
  assert.equal(client.canUndo, false);
});
