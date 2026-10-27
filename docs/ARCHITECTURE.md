# Architecture and online extension

## Responsibilities

The UI renders snapshots and sends commands. It does not mutate authoritative match state.

```text
UI → game client → local or remote transport → validated command → engine
UI ← subscription ← authoritative snapshot
```

- `assets/manifest.js`: optional artwork keyed by card/noble IDs; missing art keeps blank frames.
- `colors/palette.js`: player highlights and gem colors/names. `tokens.css` defines interface colors.
- `rules/config.js`: supported player counts, supply, action limits, scoring target.
- `rules/practice-deck.js`: replaceable provisional cards/nobles. `rules/view.js`: rulebook content; update it alongside rule changes.
- `settings/config.js`: browser-save key and default players. `settings/view.js`: setup rendering.
- `game/engine.js`: portable game operations. Use `applyCommand`, rather than invoking these primitives from clients.
- `game/commands.js`: turn ownership, explicit authenticated identity, revision checks, duplicate IDs, payload validation, and atomic state updates.
- `game/state.js`: seeded match creation, old-save normalization, and private player views.
- `multiplayer/client.js`: one command in flight, stable actor identity, and transport-independent UI API.

Local play retains its existing browser save key. Migration adds stable player IDs/seats and revision fields. Undo and Redo are local-only and restore the whole action, including turn resolution. A new action clears Redo. Saving player names changes the existing match and preserves those names across Undo/Redo; it does not reset the table. Remote name changes should be implemented through the authenticated room service. Player seat and color depend on the original seating order, not the active turn.

## Connect a future online server

Replace the local transport creation in `src/main.js` with a remote transport and a session-specific player ID:

```js
import { createGameClient } from './multiplayer/client.js';
import { createRemoteTransport } from './multiplayer/remote-transport.js';
import { mountApp } from './ui/app.js';

const transport = createRemoteTransport({
  initialSnapshot: joinedRoom.snapshot,
  request: (command) => roomApi.sendCommand(command),
  subscribeToSnapshots: (listener) => roomApi.subscribe(listener),
});
const client = createGameClient({ transport, actorId: joinedRoom.playerId });
const disposeUI = mountApp({ client });
// On leaving: disposeUI(); client.dispose();
```

`joinedRoom` and `roomApi` are integration placeholders to implement. `request` returns a current authoritative player-view snapshot; subscriptions supply the same shape. It must reject failed requests with an Error. Reconnection should fetch a current snapshot and recreate the adapter. Older revision pushes are ignored.

Each command contains `id`, `actorId`, `expectedRevision`, `type`, and `payload`. Supported types are exported as `COMMANDS`: take gems, buy card, reserve card, return tokens, claim noble, and end turn.

On the server, import the same portable `createMatch`, `applyCommand`, and `getPlayerView` functions. Authenticate the connection, look up the player's room seat, and pass that trusted identity as `authenticatedPlayerId`:

```js
const next = applyCommand(room.state, command, {
  authenticatedPlayerId: authenticatedSeat.playerId,
});
await persistRoomAtomically(room.id, room.state.revision, next);
// Send a separately projected snapshot to each authenticated player.
const snapshot = getPlayerView(next, authenticatedSeat.playerId);
```

The room service must serialize commands or perform an atomic revision comparison, persist before broadcasting, and return the latest snapshot on a stale revision so clients can recover. Never treat the command's claimed actor ID as authentication. Keep full decks, match seed, and other players' reserved cards on the server; `getPlayerView` hides those fields. Do not expose local storage or local undo as a shared server authority.

Not included: room/lobby UI, authentication, WebSocket/HTTP service, reconnection protocol, database, production rate limits, or server hosting. Tests simulate an authoritative remote boundary, not a deployed multiplayer service.
