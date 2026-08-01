import { Income, Bill, Adjustment, DailyBalance, Transaction } from '../types';

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Parse a YYYY-MM-DD string as local midnight (not UTC midnight)
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Display a stored YYYY-MM-DD date string in local time
export function formatDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString();
}

export function calculateProjectedBalances(
  startingBalance: number,
  startDate: Date,
  endDate: Date,
  income: Income[],
  bills: Bill[],
  adjustments: Adjustment[]
): DailyBalance[] {
  const dailyBalances: DailyBalance[] = [];
  let currentBalance = startingBalance;

  const allTransactions = generateAllTransactions(startDate, endDate, income, bills, adjustments);
  const transactionsByDate = groupTransactionsByDate(allTransactions);

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = toLocalDateStr(currentDate);
    const dayTransactions = transactionsByDate.get(dateStr) || [];

    dayTransactions.forEach(t => {
      if (t.is_set_balance) {
        currentBalance = t.amount;
      } else {
        currentBalance += t.amount;
      }
      t.balance = currentBalance;
    });

    dailyBalances.push({
      date: dateStr,
      balance: currentBalance,
      transactions: dayTransactions
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dailyBalances;
}

function generateAllTransactions(
  startDate: Date,
  endDate: Date,
  income: Income[],
  bills: Bill[],
  adjustments: Adjustment[]
): Transaction[] {
  const transactions: Transaction[] = [];
  const startStr = toLocalDateStr(startDate);
  const endStr = toLocalDateStr(endDate);

  // Generate income transactions
  income.filter(inc => inc.is_active).forEach(inc => {
    if (inc.frequency === 'weekly' || inc.frequency === 'bi-weekly') {
      const incomeDate = parseLocalDate(inc.start_date!);
      let currentDate = new Date(incomeDate);
      const dayInterval = inc.frequency === 'weekly' ? 7 : 14;

      while (toLocalDateStr(currentDate) <= endStr) {
        const dateStr = toLocalDateStr(currentDate);
        if (dateStr >= startStr) {
          transactions.push({
            date: dateStr,
            name: inc.name,
            amount: inc.amount,
            type: 'income'
          });
        }
        currentDate.setDate(currentDate.getDate() + dayInterval);
      }
    } else if (inc.frequency === 'fixed-dates') {
      // Parse fixed dates (e.g., "1,15")
      const days = inc.fixed_dates!.split(',').map(d => parseInt(d.trim())).filter(d => d >= 1 && d <= 31);

      let year = startDate.getFullYear();
      let month = startDate.getMonth();
      while (true) {
        const sentinel = getDayOfMonth(year, month, 1);
        if (toLocalDateStr(sentinel) > endStr) break;

        days.forEach(day => {
          const paymentDate = getDayOfMonth(year, month, day);
          const dateStr = toLocalDateStr(paymentDate);

          if (dateStr >= startStr && dateStr <= endStr) {
            transactions.push({
              date: dateStr,
              name: inc.name,
              amount: inc.amount,
              type: 'income'
            });
          }
        });

        month++;
        if (month > 11) { month = 0; year++; }
      }
    }
  });

  // Generate bill transactions (monthly)
  bills.filter(bill => bill.is_active).forEach(bill => {
    let year = startDate.getFullYear();
    let month = startDate.getMonth();

    while (true) {
      const billDate = getDayOfMonth(year, month, bill.due_day);
      const dateStr = toLocalDateStr(billDate);

      if (dateStr > endStr) break;

      if (dateStr >= startStr) {
        transactions.push({
          date: dateStr,
          name: bill.name,
          amount: -bill.amount,
          type: 'bill'
        });
      }

      month++;
      if (month > 11) { month = 0; year++; }
    }
  });

  // Add manual adjustments
  adjustments.forEach(adj => {
    if (adj.date >= startStr && adj.date <= endStr) {
      transactions.push({
        date: adj.date,
        name: adj.name,
        amount: adj.amount,
        type: 'adjustment',
        is_set_balance: adj.is_set_balance
      });
    }
  });

  return transactions.sort((a, b) => a.date.localeCompare(b.date));
}

function getDayOfMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const actualDay = Math.min(day, lastDay);
  return new Date(year, month, actualDay);
}

function groupTransactionsByDate(transactions: Transaction[]): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  transactions.forEach(t => {
    const existing = grouped.get(t.date) || [];
    existing.push(t);
    grouped.set(t.date, existing);
  });

  return grouped;
}

export function getNextIncomeDate(income: Income[]): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextDate: Date | null = null;

  income.filter(inc => inc.is_active).forEach(inc => {
    if (inc.frequency === 'weekly' || inc.frequency === 'bi-weekly') {
      const startDate = parseLocalDate(inc.start_date!);
      let currentDate = new Date(startDate);
      const dayInterval = inc.frequency === 'weekly' ? 7 : 14;

      while (currentDate < today) {
        currentDate.setDate(currentDate.getDate() + dayInterval);
      }

      if (!nextDate || currentDate < nextDate) {
        nextDate = currentDate;
      }
    } else if (inc.frequency === 'fixed-dates') {
      const days = inc.fixed_dates!.split(',').map(d => parseInt(d.trim())).filter(d => d >= 1 && d <= 31);

      // Check this month and next month
      for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
        const checkDate = new Date(today);
        checkDate.setMonth(checkDate.getMonth() + monthOffset);

        days.forEach(day => {
          const paymentDate = getDayOfMonth(checkDate.getFullYear(), checkDate.getMonth(), day);

          if (paymentDate >= today && (!nextDate || paymentDate < nextDate)) {
            nextDate = paymentDate;
          }
        });
      }
    }
  });

  return nextDate;
}

export function getUpcomingBills(bills: Bill[], days: number = 7): Bill[] {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const upcomingBills: Bill[] = [];

  bills.filter(bill => bill.is_active).forEach(bill => {
    const billDate = getDayOfMonth(today.getFullYear(), today.getMonth(), bill.due_day);

    if (billDate >= today && billDate <= endDate) {
      upcomingBills.push(bill);
    }
  });

  return upcomingBills;
}
