// Mock Electron API for browser development
import { Income, Bill, Adjustment, ElectronAPI } from './types';

// In-memory storage
let incomeData: Income[] = [];
let billsData: Bill[] = [];
let adjustmentsData: Adjustment[] = [];
let idCounter = { income: 1, bills: 1, adjustments: 1 };

// Load from localStorage if available
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem('cashflow-data');
    if (stored) {
      const data = JSON.parse(stored);
      incomeData = data.income || [];
      billsData = data.bills || [];
      adjustmentsData = data.adjustments || [];
      idCounter = data.idCounter || { income: 1, bills: 1, adjustments: 1 };
    }
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
  }
};

const saveToStorage = () => {
  try {
    localStorage.setItem('cashflow-data', JSON.stringify({
      income: incomeData,
      bills: billsData,
      adjustments: adjustmentsData,
      idCounter
    }));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

loadFromStorage();

export const mockElectronAPI: ElectronAPI = {
  income: {
    getAll: async () => {
      return Promise.resolve([...incomeData]);
    },
    create: async (income) => {
      const newIncome = { ...income, id: idCounter.income++ };
      incomeData.push(newIncome);
      saveToStorage();
      return Promise.resolve(newIncome.id);
    },
    update: async (id, income) => {
      const index = incomeData.findIndex(i => i.id === id);
      if (index >= 0) {
        incomeData[index] = { ...incomeData[index], ...income };
        saveToStorage();
      }
      return Promise.resolve();
    },
    delete: async (id) => {
      incomeData = incomeData.filter(i => i.id !== id);
      saveToStorage();
      return Promise.resolve();
    }
  },
  bills: {
    getAll: async () => {
      return Promise.resolve([...billsData]);
    },
    create: async (bill) => {
      const newBill = { ...bill, id: idCounter.bills++ };
      billsData.push(newBill);
      saveToStorage();
      return Promise.resolve(newBill.id);
    },
    update: async (id, bill) => {
      const index = billsData.findIndex(b => b.id === id);
      if (index >= 0) {
        billsData[index] = { ...billsData[index], ...bill };
        saveToStorage();
      }
      return Promise.resolve();
    },
    delete: async (id) => {
      billsData = billsData.filter(b => b.id !== id);
      saveToStorage();
      return Promise.resolve();
    }
  },
  adjustments: {
    getAll: async () => {
      return Promise.resolve([...adjustmentsData]);
    },
    create: async (adjustment) => {
      const newAdjustment = {
        ...adjustment,
        id: idCounter.adjustments++,
        created_at: new Date().toISOString()
      };
      adjustmentsData.push(newAdjustment);
      saveToStorage();
      return Promise.resolve(newAdjustment.id);
    },
    delete: async (id) => {
      adjustmentsData = adjustmentsData.filter(a => a.id !== id);
      saveToStorage();
      return Promise.resolve();
    }
  }
};
