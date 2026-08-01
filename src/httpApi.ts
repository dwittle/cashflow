import { Income, Bill, Adjustment, ElectronAPI } from './types';

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`API ${method} ${url} failed: ${res.status}`);
  return res.json();
}

export const httpApi: ElectronAPI = {
  income: {
    getAll: () => req<Income[]>('GET', '/api/income'),
    create: (income) => req<number>('POST', '/api/income', income),
    update: (id, income) => req<void>('PUT', `/api/income/${id}`, income),
    delete: (id) => req<void>('DELETE', `/api/income/${id}`)
  },
  bills: {
    getAll: () => req<Bill[]>('GET', '/api/bills'),
    create: (bill) => req<number>('POST', '/api/bills', bill),
    update: (id, bill) => req<void>('PUT', `/api/bills/${id}`, bill),
    delete: (id) => req<void>('DELETE', `/api/bills/${id}`)
  },
  adjustments: {
    getAll: () => req<Adjustment[]>('GET', '/api/adjustments'),
    create: (adjustment) => req<number>('POST', '/api/adjustments', adjustment),
    delete: (id) => req<void>('DELETE', `/api/adjustments/${id}`)
  }
};
