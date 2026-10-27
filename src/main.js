import { applyPalette } from './colors/palette.js';
import { APP_SETTINGS } from './settings/config.js';
import { createLocalTransport } from './multiplayer/local-transport.js';
import { createGameClient } from './multiplayer/client.js';
import { browserStorage } from './multiplayer/storage.js';
import { mountApp } from './ui/app.js';

applyPalette(document.documentElement);
const transport = createLocalTransport({
  playerNames: APP_SETTINGS.defaultPlayerNames,
  storage: browserStorage(APP_SETTINGS.storageKey, undefined, {
    legacyKeys: APP_SETTINGS.legacyStorageKeys,
  }),
  onStorageError: () => document.dispatchEvent(new Event('blendor:storage-error')),
});
const client = createGameClient({ transport });
mountApp({ client });
