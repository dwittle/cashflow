# CashFlow Tracker

A personal finance tracking application built with React, TypeScript, and SQLite. Track income (weekly, bi-weekly, or fixed calendar dates), monthly bills, and predict your cash flow for the next 90 days.

It ships two ways, sharing the same React UI and the same database:

- **Desktop app** (`electron/`) — a standalone Electron app talking to SQLite directly.
- **Web app** (`server/`) — an Express server exposing the same operations over a REST API, so you can run it as a background service and use it from a browser at `http://localhost:3001`.

Both read and write the same SQLite file, so data you enter in one shows up in the other.

## Features

- **Income Tracking**: weekly, bi-weekly, or fixed-calendar-date (e.g. "1st and 15th") recurring income
- **Monthly Bill Management**: recurring bills with a customizable due day, inline editing
- **Manual Adjustments**: one-time expenses/income, or a "Set Balance" adjustment that resets the projected balance to an exact amount on a given date
- **90-Day Balance Projection**: line chart plus a calendar view with graduated color shading by balance
- **Low Balance Warnings**: flagged when your balance is projected to drop below $100
- **SQLite Database**: all data stored locally in a portable database file, shared between the desktop and web app

## Prerequisites

- Node.js (v18 or higher)
- npm

Install dependencies once, from the repo root:
```bash
npm install
```

## Desktop App (Electron)

### Development
Run with a live-reloading renderer plus the Electron shell:
```bash
npm run dev:electron
```

### Building and running from source
```bash
npm run build   # bundles the Electron main/preload/renderer processes into dist/
npm start        # build, then launch electron .
```

### Installing a distributable
```bash
npm run package
```
This builds the app and runs electron-builder, producing:
- `release/CashFlow Tracker Setup 1.0.0.exe` — the Windows installer. Run it to install the app normally.
- `release/win-unpacked/CashFlow Tracker.exe` — an unpacked, portable copy you can run directly without installing.

> On Windows, packaging requires either Developer Mode enabled or an elevated shell — electron-builder's executable resource-editing step needs to create symlinks while extracting its `winCodeSign` dependency. This repo works around it via `build.win.signAndEditExecutable: false` in `package.json`, at the cost of the packaged `.exe` not having a custom icon or embedded version metadata baked in.

## Web App (Express Server)

### Development
Runs the compiled server, the browser dev server, and a `tsc --watch` for the server code together, proxying `/api` requests to the server:
```bash
npm run dev:full
```
Or without the auto-restarting server (server code must already be built):
```bash
npm run dev:server
```

### Building and running from source
```bash
npm run build:service   # compiles server/ (tsc) and builds the production browser bundle
npm run start:server    # runs the compiled server directly, at http://localhost:3001
```
This runs in the foreground — press `Ctrl+C` in that terminal to stop it. While it's running, `http://localhost:3001` responds; once stopped, requests to it fail to connect.

### Installing as a Windows service
Run as Administrator so it starts automatically and keeps running in the background:
```bash
npm run service:install
```
This registers and starts a Windows service named "CashFlow Tracker" that serves the app at `http://localhost:3001`. To remove it:
```bash
npm run service:uninstall
```

#### Checking status, stopping, and starting the service
There's no npm script for this — use Windows' own service tooling (PowerShell, as Administrator):
```powershell
Get-Service "CashFlow Tracker"    # shows Running / Stopped
Stop-Service "CashFlow Tracker"
Start-Service "CashFlow Tracker"
```
Or open `services.msc` and find "CashFlow Tracker" in the list, where you can check its status and start/stop/restart it from the GUI. Note that `service:uninstall` stops and removes the service entirely — use `Stop-Service`/`Start-Service` if you just want to pause it temporarily.

## Testing

```bash
npm test
```
Runs the Jest suite (currently ~65 tests) covering the balance-projection logic in `src/utils/calculations.ts`.

## Project Structure

```
cashflow/
├── electron/          # Electron main process, preload script, and SQLite access
│   ├── main.ts        # Application entry point
│   ├── preload.ts     # IPC bridge exposed to the renderer as window.electron
│   └── database.ts    # SQLite operations (desktop app)
├── server/             # Express server for the web/service deployment
│   ├── server.ts      # REST API + static file serving
│   └── database.ts    # SQLite operations (web app) — same schema/queries as electron/database.ts
├── service/            # Windows service install/uninstall scripts (node-windows)
├── src/                # React application, shared by both desktop and web builds
│   ├── components/    # React components
│   ├── types/         # TypeScript interfaces, including the window.electron API contract
│   ├── utils/         # Balance projection logic + tests
│   ├── httpApi.ts     # window.electron implementation that calls the Express REST API
│   ├── App.tsx         # Main app component
│   └── index.tsx      # React entry point
└── public/             # Static assets
```

## Usage

### Adding Income
1. Navigate to the "Income" tab
2. Enter the name and amount
3. Choose a frequency — weekly, bi-weekly, or fixed dates (e.g. "1,15" for the 1st and 15th of each month)
4. For weekly/bi-weekly, set the first payment date; income recurs from there

### Adding Bills
1. Navigate to the "Bills" tab
2. Enter the name, amount, and due day (1–31)
3. Bills recur on that day each month (clamped to the last day of shorter months, e.g. a due day of 31 falls on Feb 28/29)
4. Edit a bill's fields inline from the list

### Adding Adjustments
1. Navigate to the "Adjustments" tab
2. Choose Expense, Income, or Set Balance
   - Expense/Income are one-time amounts applied on the given date
   - Set Balance overrides the projected balance to an exact amount on that date, instead of adding to it
3. Enter the name, amount, and date

### Viewing Projections
1. Go to the "Dashboard" tab
2. Set your starting balance
3. View the 90-day balance projection chart and the balance calendar
4. See upcoming bills (next 7 days) and the next income date

## Data Storage

Both the desktop app and the web app read and write the same SQLite database file:

- **Windows**: `%APPDATA%\CashFlow Tracker\cashflow.db`
- **macOS/Linux**: `~/.config/CashFlow Tracker/cashflow.db`

The location can be overridden with the `DB_PATH` environment variable (useful for the Windows service, or for pointing a dev instance at a separate file).

## License

MIT
