# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CashFlow Tracker — a personal finance app (bi-weekly/weekly/fixed-date income, monthly bills, one-off adjustments) that projects account balance forward. Same React UI ships two ways:

1. **Electron desktop app** — `electron/` main process talks to SQLite directly via IPC.
2. **Express web server** — `server/` exposes the same operations as a REST API, for `npm run service:install` (runs as a Windows service via `node-windows`) so the app can be reached from a browser at `http://localhost:3001`.

`electron/database.ts` and `server/database.ts` are independent, near-duplicate SQLite implementations (same schema, same CRUD) — one per runtime target. If you change one (e.g. add a column, change a query), check whether the other needs the same change.

## Commands

```bash
npm run dev              # webpack-dev-server on :3000, browser-only (mocked/HTTP API)
npm run dev:electron     # electron main+preload watch + renderer dev server, opens Electron window
npm run dev:server       # tsc watch on server + webpack dev server (browser hitting real Express API)
npm run dev:full         # server watch + dev server + running Express server together (proxied)

npm run build            # webpack build for Electron (main, preload, renderer)
npm start                # build + launch electron .
npm run build:web        # production browser bundle (for the Express server to serve)
npm run build:server     # compile server/ with tsc
npm run build:service    # build:server + build:web — what the Windows service actually runs
npm run start:server     # run compiled Express server directly (dist/server/server/server.js)

npm run package          # electron-builder, produces installers in release/

npm test                 # jest (ts-jest, node env)
npx jest calculations    # run a single test file
npx jest -t "name"       # run tests matching a name pattern

npm run service:install    # registers Windows service (run as Administrator)
npm run service:uninstall  # unregisters it
```

There is no lint script configured.

## Architecture

**Runtime abstraction via `window.electron`.** `src/App.tsx` and all components call `window.electron.{income,bills,adjustments}.*` exclusively — never `fetch` or IPC directly. Three different implementations satisfy that `ElectronAPI` interface (`src/types/index.ts`) depending on how the app is launched:
- `electron/preload.ts` — real IPC bridge, used in the Electron app.
- `src/httpApi.ts` — calls the Express `/api/*` routes; `src/index.tsx` installs this as `window.electron` whenever `window.electron` isn't already set by preload (i.e. running in a plain browser).
- `src/mockElectronAPI.ts` — in-memory/localStorage stand-in; exists but is not wired up in `index.tsx` by default.

When adding a new data operation, it needs to be added in lockstep across: `src/types/index.ts` (`ElectronAPI` interface), `electron/database.ts` + `electron/main.ts` (IPC handler), `electron/preload.ts`, `server/database.ts` + `server/server.ts` (REST route), and `src/httpApi.ts`.

**Data model** (`src/types/index.ts`): `Income` (weekly/bi-weekly/fixed-dates recurrence), `Bill` (monthly, by `due_day`), `Adjustment` (one-off; `is_set_balance` means "reset balance to this amount" rather than "add this amount"). Both SQLite schemas live inline in each `database.ts` as `CREATE TABLE IF NOT EXISTS`, with `is_set_balance` added via a swallowed `ALTER TABLE` for backward compatibility with pre-existing DBs.

**Projection logic** (`src/utils/calculations.ts`) is the core domain logic and is unit-tested (`src/utils/__tests__/calculations.test.ts`, 65 tests). Key points:
- All dates are handled as local-midnight `Date` objects and `YYYY-MM-DD` strings (`parseLocalDate`/`toLocalDateStr`) — never use raw `new Date(dateString)` parsing or UTC methods here, that reintroduces timezone-shift bugs that were previously fixed.
- Monthly recurrence (bills, fixed-date income) clamps to the last valid day of shorter months via `getDayOfMonth` (e.g. a due day of 31 lands on Feb 28/29) rather than skipping the month.
- `calculateProjectedBalances` walks day-by-day from `startDate` to `endDate`, applying that day's transactions in order; `is_set_balance` adjustments override the running balance instead of adding to it.

**Build targets**: `tsconfig.json` covers `src/` + `electron/` (Electron/browser build, strict mode). `tsconfig.server.json` covers `server/` + `src/types/` only (Node build for the Express server, non-strict) and explicitly excludes the Electron/React-only files. `webpack.config.js` produces three bundles (electron-main, electron-preload, renderer); `webpack.browser.config.js` produces just the renderer for the plain-browser/server-hosted build, with a dev-server proxy of `/api` to `:3001`.

## Notes

- **Shared data file**: `electron/database.ts` and `server/database.ts` both resolve to the same on-disk SQLite file (`%APPDATA%\CashFlow Tracker\cashflow.db` on Windows, overridable via `DB_PATH`), so the desktop app and the browser/service app always see the same data. Don't reintroduce Electron's default `app.getPath('userData')` path here — that resolves to a different folder (based on `package.json`'s `name`) and would silently split the data in two.
- **Packaging on Windows without admin/Developer Mode**: `npm run package` (electron-builder) tries to extract `winCodeSign` for an executable resource-editing step (icon/version metadata), which contains macOS symlinks Windows can't create without elevated privileges — it fails with `Cannot create symbolic link: A required privilege is not held by the client.` and only produces `release/win-unpacked` instead of the NSIS installer. `package.json`'s `build.win.signAndEditExecutable: false` works around this (cosmetic trade-off only: no custom icon/version info baked into the `.exe`).
- **DevTools gating**: `electron/main.ts` opens DevTools based on `!app.isPackaged`, not `NODE_ENV`. `webpack.config.js` hardcodes `mode: 'development'` for the Electron bundles, which makes webpack inline `process.env.NODE_ENV` as `"development"` at compile time in every build, including packaged ones — an `if (process.env.NODE_ENV === 'development')` check here would always be true and pop DevTools open in the shipped app.
