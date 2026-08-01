# CashFlow Tracker

A personal finance tracking application built with Electron, React, and TypeScript. Track bi-weekly income, monthly bills, and predict your cash flow for the next 90 days.

## Features

- **Bi-weekly Income Tracking**: Add income sources that recur every 14 days
- **Monthly Bill Management**: Track recurring bills with customizable due dates
- **Manual Adjustments**: Record one-time expenses or income
- **90-Day Balance Projection**: Visual chart showing your predicted account balance
- **Low Balance Warnings**: Get notified when your balance is projected to drop below $100
- **SQLite Database**: All data stored locally in a portable database file

## Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Build the application:
```bash
npm run build
```

3. Start the application:
```bash
npm start
```

## Development

Run in development mode with hot reload:
```bash
npm run dev
```

## Building for Distribution

Create a distributable package:
```bash
npm run package
```

This will create installers in the `release/` directory for your platform.

## Project Structure

```
cashflow/
├── electron/          # Electron main process and database
│   ├── main.ts       # Application entry point
│   ├── preload.ts    # IPC bridge
│   └── database.ts   # SQLite operations
├── src/              # React application
│   ├── components/   # React components
│   ├── types/        # TypeScript interfaces
│   ├── utils/        # Helper functions
│   ├── App.tsx       # Main app component
│   └── index.tsx     # React entry point
└── public/           # Static assets
```

## Usage

### Adding Income
1. Navigate to the "Income" tab
2. Enter the name, amount, and first payment date
3. Income will automatically recur every 14 days

### Adding Bills
1. Navigate to the "Bills" tab
2. Enter the name, amount, and due day (1-31)
3. Bills will automatically recur on that day each month

### Adding Adjustments
1. Navigate to the "Adjustments" tab
2. Select whether it's an expense or income
3. Enter the name, amount, and date
4. This is a one-time transaction

### Viewing Projections
1. Go to the "Dashboard" tab
2. Set your starting balance
3. View the 90-day balance projection chart
4. See upcoming bills and next income date

## Data Storage

All data is stored in a SQLite database file located at:
- **macOS**: `~/Library/Application Support/cashflow-tracker/cashflow.db`
- **Windows**: `%APPDATA%/cashflow-tracker/cashflow.db`
- **Linux**: `~/.config/cashflow-tracker/cashflow.db`

## License

MIT
