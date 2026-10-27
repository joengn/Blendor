# Blendor

A browser-based, local pass-and-play Splendor-style table for 2–4 players. The board supports canvas zoom, fixed player seats, colored turn highlights, card and gem action popovers, rules, saved player-name editing, Undo/Redo, and browser-save recovery. Artwork frames intentionally remain blank.

## Run locally

Requires Node.js 22. No third-party runtime or development dependencies are required.

```sh
npm ci
npm run dev
```

Open http://localhost:4173. Use `PORT=4174 npm run dev` if that port is busy.

```sh
npm run verify  # syntax, module imports, and game/interaction tests
npm run build   # generate static dist/
npm run preview # serve dist/ locally
npm run package # verify, build, and create both ZIP packages
```

Browser saves from the previous Bartendor name are read automatically; new saves use `blendor-game`.

## Project layout

```text
src/
  assets/       Artwork manifest, blank image folder, and interface icons
  colors/       Gem/player palettes and interface color tokens
  rules/        Game limits, provisional card data, selection rules, rulebook
  settings/     App defaults and table setup screen
  game/         Browser-independent engine, match state, validated commands
  multiplayer/  Game client, local storage/transport, injectable remote adapter
  ui/           Rendering, canvas, popovers, and activity
  styles/       Layout and component styles
scripts/        Dependency-free build, preview, checks, and ZIP packaging
tests/         Game, command, transport, and interaction tests
docs/          Architecture and deployment guides
.github/        CI and manual GitHub Pages deployment workflows
```

See [architecture and online integration](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md), and [adding artwork](src/assets/README.md).

## Packages

- `release/blendor-source.zip`: clean project for GitHub, including source, tests, docs, and workflows. Excludes Git history, hosting account metadata, browser saves, credentials, and generated builds.
- `release/blendor-deploy.zip`: ready-to-upload static website; `index.html` is at the archive root.

Online multiplayer is **not yet a running feature**. The remote adapter and authoritative command boundary are ready for a developer to connect a server. Rooms, login, networking, and server persistence still need implementation.

The current development and noble data are provisional practice data, not a verified reproduction of the published card set. Replace them in `src/rules/practice-deck.js` when final game data/assets are supplied. This project does not bundle official game artwork. No open-source license has been granted; choose a license before public distribution.
