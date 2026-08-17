import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { Income, Bill, Adjustment, BackupData } from '../src/types';

let db: Database.Database;

function getDbPath(): string {
  const appDataPath = process.env.APPDATA || path.join(os.homedir(), '.config');
  const dir = path.join(appDataPath, 'CashFlow Tracker');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'cashflow.db');
}

export function initDatabase(): void {
  const dbPath = process.env.DB_PATH || getDbPath();
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL,
      start_date TEXT,
      fixed_dates TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      due_day INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      next_due_date TEXT,
      next_amount REAL,
      next_paid INTEGER DEFAULT 0
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      is_set_balance INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    db.exec('ALTER TABLE adjustments ADD COLUMN is_set_balance INTEGER DEFAULT 0');
  } catch {
    // column already exists
  }

  try {
    db.exec('ALTER TABLE bills ADD COLUMN next_due_date TEXT');
  } catch {
    // column already exists
  }
  try {
    db.exec('ALTER TABLE bills ADD COLUMN next_amount REAL');
  } catch {
    // column already exists
  }
  try {
    db.exec('ALTER TABLE bills ADD COLUMN next_paid INTEGER DEFAULT 0');
  } catch {
    // column already exists
  }

  console.log('Database initialized at:', dbPath);
}

export const incomeOps = {
  getAll(): Income[] {
    return db.prepare('SELECT * FROM income ORDER BY start_date DESC').all() as Income[];
  },

  create(income: Omit<Income, 'id'>): number {
    const result = db.prepare(
      'INSERT INTO income (name, amount, frequency, start_date, fixed_dates, is_active) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(income.name, income.amount, income.frequency, income.start_date || null, income.fixed_dates || null, income.is_active);
    return result.lastInsertRowid as number;
  },

  update(id: number, income: Partial<Income>): void {
    const fields = Object.keys(income)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.keys(income)
      .filter(key => key !== 'id')
      .map(key => income[key as keyof Income]);

    db.prepare(`UPDATE income SET ${fields} WHERE id = ?`).run(...values, id);
  },

  delete(id: number): void {
    db.prepare('DELETE FROM income WHERE id = ?').run(id);
  }
};

export const billOps = {
  getAll(): Bill[] {
    return db.prepare('SELECT * FROM bills ORDER BY due_day').all() as Bill[];
  },

  create(bill: Omit<Bill, 'id'>): number {
    const result = db.prepare(
      'INSERT INTO bills (name, amount, due_day, is_active) VALUES (?, ?, ?, ?)'
    ).run(bill.name, bill.amount, bill.due_day, bill.is_active);
    return result.lastInsertRowid as number;
  },

  update(id: number, bill: Partial<Bill>): void {
    const fields = Object.keys(bill)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.keys(bill)
      .filter(key => key !== 'id')
      .map(key => bill[key as keyof Bill]);

    db.prepare(`UPDATE bills SET ${fields} WHERE id = ?`).run(...values, id);
  },

  delete(id: number): void {
    db.prepare('DELETE FROM bills WHERE id = ?').run(id);
  }
};

export const adjustmentOps = {
  getAll(): Adjustment[] {
    return db.prepare('SELECT * FROM adjustments ORDER BY date DESC').all() as Adjustment[];
  },

  create(adjustment: Omit<Adjustment, 'id' | 'created_at'>): number {
    const result = db.prepare(
      'INSERT INTO adjustments (name, amount, date, is_set_balance) VALUES (?, ?, ?, ?)'
    ).run(adjustment.name, adjustment.amount, adjustment.date, adjustment.is_set_balance ?? 0);
    return result.lastInsertRowid as number;
  },

  delete(id: number): void {
    db.prepare('DELETE FROM adjustments WHERE id = ?').run(id);
  }
};

// Full-database backup/restore
export const dataOps = {
  exportAll(): BackupData {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      income: incomeOps.getAll(),
      bills: billOps.getAll(),
      adjustments: adjustmentOps.getAll()
    };
  },

  // Replaces every row in income/bills/adjustments with the given snapshot,
  // preserving original ids. Runs as one transaction so a bad import can't
  // leave the database half-replaced.
  importAll(data: BackupData): void {
    const insertIncome = db.prepare(
      'INSERT INTO income (id, name, amount, frequency, start_date, fixed_dates, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertBill = db.prepare(
      'INSERT INTO bills (id, name, amount, due_day, is_active, next_due_date, next_amount, next_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertAdjustment = db.prepare(
      'INSERT INTO adjustments (id, name, amount, date, is_set_balance, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const runImport = db.transaction((data: BackupData) => {
      db.prepare('DELETE FROM income').run();
      db.prepare('DELETE FROM bills').run();
      db.prepare('DELETE FROM adjustments').run();

      data.income.forEach(inc => insertIncome.run(
        inc.id ?? null, inc.name, inc.amount, inc.frequency, inc.start_date || null, inc.fixed_dates || null, inc.is_active
      ));
      data.bills.forEach(bill => insertBill.run(
        bill.id ?? null, bill.name, bill.amount, bill.due_day, bill.is_active,
        bill.next_due_date ?? null, bill.next_amount ?? null, bill.next_paid ?? 0
      ));
      data.adjustments.forEach(adj => insertAdjustment.run(
        adj.id ?? null, adj.name, adj.amount, adj.date, adj.is_set_balance ?? 0, adj.created_at || new Date().toISOString()
      ));
    });

    runImport(data);
  }
};

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
