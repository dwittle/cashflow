export interface Income {
  id?: number;
  name: string;
  amount: number;
  frequency: 'weekly' | 'bi-weekly' | 'fixed-dates';
  start_date?: string; // For weekly/bi-weekly
  fixed_dates?: string; // Comma-separated days like "1,15" for fixed-dates
  is_active: number;
}

export interface Bill {
  id?: number;
  name: string;
  amount: number;
  due_day: number;
  is_active: number;
  // Override applied to a single upcoming occurrence (identified by next_due_date),
  // without changing the recurring `amount`/schedule used for all other months.
  next_due_date?: string | null;
  next_amount?: number | null;
  next_paid?: number;
}

export interface Adjustment {
  id?: number;
  name: string;
  amount: number;
  date: string;
  is_set_balance?: number;
  created_at?: string;
}

export interface Transaction {
  date: string;
  name: string;
  amount: number;
  type: 'income' | 'bill' | 'adjustment';
  is_set_balance?: number;
  balance?: number;
}

export interface DailyBalance {
  date: string;
  balance: number;
  transactions: Transaction[];
}

export interface BackupData {
  version: number;
  exportedAt: string;
  income: Income[];
  bills: Bill[];
  adjustments: Adjustment[];
}

export interface ElectronAPI {
  income: {
    getAll: () => Promise<Income[]>;
    create: (income: Omit<Income, 'id'>) => Promise<number>;
    update: (id: number, income: Partial<Income>) => Promise<void>;
    delete: (id: number) => Promise<void>;
  };
  bills: {
    getAll: () => Promise<Bill[]>;
    create: (bill: Omit<Bill, 'id'>) => Promise<number>;
    update: (id: number, bill: Partial<Bill>) => Promise<void>;
    delete: (id: number) => Promise<void>;
  };
  adjustments: {
    getAll: () => Promise<Adjustment[]>;
    create: (adjustment: Omit<Adjustment, 'id' | 'created_at'>) => Promise<number>;
    delete: (id: number) => Promise<void>;
  };
  data: {
    // Full snapshot of every table, for backup/transfer.
    exportAll: () => Promise<BackupData>;
    // Replaces all existing income/bills/adjustments with the given snapshot.
    importAll: (data: BackupData) => Promise<void>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
