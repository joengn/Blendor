import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browserStorage } from '../src/multiplayer/storage.js';
import { createLocalTransport } from '../src/multiplayer/local-transport.js';
import { createMatch } from '../src/game/state.js';
import { APP_SETTINGS } from '../src/settings/config.js';

function memoryStorage(entries = []) {
  const data = new Map(entries);
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
test('Blendor recovers a legacy match and saves to its new key without deleting the old save', () => {
  const match = createMatch(['Alex', 'Sam'], { seed: 'legacy-brand' });
  const serialized = JSON.stringify(match);
  const target = memoryStorage([['bartendor-game', serialized]]);
  const storage = browserStorage(APP_SETTINGS.storageKey, target, {
    legacyKeys: APP_SETTINGS.legacyStorageKeys,
  });
  assert.deepEqual(storage.read(), match);
  storage.write({ ...match, revision: 1 });
  assert.equal(JSON.parse(target.getItem('blendor-game')).revision, 1);
  assert.equal(target.getItem('bartendor-game'), serialized);
  assert.equal(storage.read().revision, 1);
});
test('new-name save takes precedence over the legacy match', () => {
  const storage = browserStorage(
    'blendor-game',
    memoryStorage([
      ['blendor-game', '{"revision":9}'],
      ['bartendor-game', '{"revision":2}'],
    ]),
    { legacyKeys: ['bartendor-game'] },
  );
  assert.equal(storage.read().revision, 9);
});
test('unavailable storage keeps local play usable and reports failed saves', async () => {
  const blocked = {
    getItem() {
      throw Error('Storage denied');
    },
    setItem() {
      throw Error('Storage denied');
    },
  };
  let warnings = 0;
  const transport = createLocalTransport({
    playerNames: ['A', 'B'],
    storage: browserStorage('blendor-game', blocked),
    onStorageError: () => warnings++,
  });
  await transport.updateNames(['C', 'D']);
  assert.equal(transport.getSnapshot().players[0].name, 'C');
  assert.equal(warnings, 1);
});
