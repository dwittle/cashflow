import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { Income, Bill, Adjustment } from '../src/types';

let db: Database.Database;

export function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'cashflow.db');

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
      is_active INTEGER DEFAULT 1
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized at:', dbPath);
}

// Income operations
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

// Bill operations
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

// Adjustment operations
export const adjustmentOps = {
  getAll(): Adjustment[] {
    return db.prepare('SELECT * FROM adjustments ORDER BY date DESC').all() as Adjustment[];
  },

  create(adjustment: Omit<Adjustment, 'id' | 'created_at'>): number {
    const result = db.prepare(
      'INSERT INTO adjustments (name, amount, date) VALUES (?, ?, ?)'
    ).run(adjustment.name, adjustment.amount, adjustment.date);
    return result.lastInsertRowid as number;
  },

  delete(id: number): void {
    db.prepare('DELETE FROM adjustments WHERE id = ?').run(id);
  }
};

export function closeDatabase() {
  if (db) {
    db.close();
  }
}
