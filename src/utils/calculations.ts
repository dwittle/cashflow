import { Income, Bill, Adjustment, DailyBalance, Transaction } from '../types';

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
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayTransactions = transactionsByDate.get(dateStr) || [];

    dayTransactions.forEach(t => {
      currentBalance += t.amount;
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

  // Generate income transactions
  income.filter(inc => inc.is_active).forEach(inc => {
    if (inc.frequency === 'weekly' || inc.frequency === 'bi-weekly') {
      const incomeDate = new Date(inc.start_date!);
      let currentDate = new Date(incomeDate);
      const dayInterval = inc.frequency === 'weekly' ? 7 : 14;

      while (currentDate <= endDate) {
        if (currentDate >= startDate) {
          transactions.push({
            date: currentDate.toISOString().split('T')[0],
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

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        days.forEach(day => {
          const paymentDate = getDayOfMonth(currentDate.getFullYear(), currentDate.getMonth(), day);

          if (paymentDate >= startDate && paymentDate <= endDate) {
            transactions.push({
              date: paymentDate.toISOString().split('T')[0],
              name: inc.name,
              amount: inc.amount,
              type: 'income'
            });
          }
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
  });

  // Generate bill transactions (monthly)
  bills.filter(bill => bill.is_active).forEach(bill => {
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const billDate = getDayOfMonth(currentDate.getFullYear(), currentDate.getMonth(), bill.due_day);

      if (billDate >= startDate && billDate <= endDate) {
        transactions.push({
          date: billDate.toISOString().split('T')[0],
          name: bill.name,
          amount: -bill.amount,
          type: 'bill'
        });
      }

      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  });

  // Add manual adjustments
  adjustments.forEach(adj => {
    const adjDate = new Date(adj.date);
    if (adjDate >= startDate && adjDate <= endDate) {
      transactions.push({
        date: adj.date,
        name: adj.name,
        amount: adj.amount,
        type: 'adjustment'
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
      const startDate = new Date(inc.start_date!);
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
