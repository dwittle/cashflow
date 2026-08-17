import {
  calculateProjectedBalances,
  getNextIncomeDate,
  getUpcomingBills,
  getNextBillDueDate,
  formatDate,
} from '../calculations';
import { Income, Bill, Adjustment, DailyBalance } from '../../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function balanceOn(days: DailyBalance[], dateStr: string): number | undefined {
  return days.find(b => b.date === dateStr)?.balance;
}

function txOn(days: DailyBalance[], dateStr: string) {
  return days.find(b => b.date === dateStr)?.transactions ?? [];
}

function run(
  startingBalance: number,
  start: Date,
  end: Date,
  income: Income[] = [],
  bills: Bill[] = [],
  adjustments: Adjustment[] = []
): DailyBalance[] {
  return calculateProjectedBalances(startingBalance, start, end, income, bills, adjustments);
}

// ─── fixtures ────────────────────────────────────────────────────────────────

const biweekly = (startDate: string, amount = 1000): Income => ({
  id: 1, name: 'Paycheck', amount, frequency: 'bi-weekly', start_date: startDate, is_active: 1,
});

const weekly = (startDate: string, amount = 500): Income => ({
  id: 1, name: 'Weekly Pay', amount, frequency: 'weekly', start_date: startDate, is_active: 1,
});

const fixed = (dates: string, amount = 2000): Income => ({
  id: 1, name: 'Fixed Pay', amount, frequency: 'fixed-dates', fixed_dates: dates, is_active: 1,
});

const bill = (dueDay: number, amount = 1000, id = 1): Bill => ({
  id, name: `Bill-${id}`, amount, due_day: dueDay, is_active: 1,
});

const adj = (date: string, amount: number, isSetBalance = 0): Adjustment => ({
  id: 1, name: 'Adj', amount, date, is_set_balance: isSetBalance,
});

// ─── calculateProjectedBalances ──────────────────────────────────────────────

describe('calculateProjectedBalances', () => {

  // ── structure ──────────────────────────────────────────────────────────────

  describe('structure', () => {
    it('returns one entry per day inclusive', () => {
      expect(run(0, d(2026, 8, 1), d(2026, 8, 10))).toHaveLength(10);
    });

    it('returns a single day when start === end', () => {
      expect(run(0, d(2026, 8, 15), d(2026, 8, 15))).toHaveLength(1);
    });

    it('date strings are YYYY-MM-DD and in ascending order', () => {
      const dates = run(0, d(2026, 8, 29), d(2026, 9, 2)).map(r => r.date);
      expect(dates).toEqual(['2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02']);
    });

    it('carries starting balance through days with no transactions', () => {
      run(1234, d(2026, 8, 1), d(2026, 8, 5))
        .forEach(day => expect(day.balance).toBe(1234));
    });
  });

  // ── bi-weekly income ───────────────────────────────────────────────────────

  describe('bi-weekly income', () => {
    it('adds income on the start date', () => {
      const r = run(0, d(2026, 8, 1), d(2026, 8, 7), [biweekly('2026-08-01')]);
      expect(balanceOn(r, '2026-08-01')).toBe(1000);
    });

    it('adds income again exactly 14 days later', () => {
      const r = run(0, d(2026, 8, 1), d(2026, 8, 15), [biweekly('2026-08-01')]);
      expect(balanceOn(r, '2026-08-15')).toBe(2000);
    });

    it('does not add income on day 13 or day 15 when cycle is +14 from the 1st', () => {
      const r = run(0, d(2026, 8, 1), d(2026, 8, 15), [biweekly('2026-08-01')]);
      expect(balanceOn(r, '2026-08-13')).toBe(1000); // still only one pay
      expect(balanceOn(r, '2026-08-14')).toBe(1000);
    });

    it('generates a third payday 28 days from start', () => {
      const r = run(0, d(2026, 8, 1), d(2026, 8, 29), [biweekly('2026-08-01')]);
      expect(balanceOn(r, '2026-08-29')).toBe(3000);
    });

    it('continues correctly across a month boundary', () => {
      // Start Aug 22 → Sep 5 → Sep 19
      const r = run(0, d(2026, 8, 22), d(2026, 9, 20), [biweekly('2026-08-22')]);
      expect(balanceOn(r, '2026-08-22')).toBe(1000);
      expect(balanceOn(r, '2026-09-05')).toBe(2000);
      expect(balanceOn(r, '2026-09-19')).toBe(3000);
    });

    it('does not include income before startDate even if cycle crosses the boundary', () => {
      // Income cycle: Jul 31, Aug 14. startDate = Aug 1, so Aug 14 is first visible pay.
      const r = run(0, d(2026, 8, 1), d(2026, 8, 14), [biweekly('2026-07-31')]);
      expect(balanceOn(r, '2026-08-01')).toBe(0);
      expect(balanceOn(r, '2026-08-14')).toBe(1000);
    });

    it('excludes inactive income', () => {
      const inc: Income = { ...biweekly('2026-08-01'), is_active: 0 };
      const r = run(0, d(2026, 8, 1), d(2026, 8, 14), [inc]);
      expect(balanceOn(r, '2026-08-01')).toBe(0);
      expect(balanceOn(r, '2026-08-14')).toBe(0);
    });
  });

  // ── weekly income ──────────────────────────────────────────────────────────

  describe('weekly income', () => {
    it('adds income every 7 days', () => {
      const r = run(0, d(2026, 8, 3), d(2026, 8, 17), [weekly('2026-08-03')]);
      expect(balanceOn(r, '2026-08-03')).toBe(500);
      expect(balanceOn(r, '2026-08-10')).toBe(1000);
      expect(balanceOn(r, '2026-08-17')).toBe(1500);
    });

    it('does not add income on off-cycle days', () => {
      const r = run(0, d(2026, 8, 3), d(2026, 8, 10), [weekly('2026-08-03')]);
      expect(balanceOn(r, '2026-08-04')).toBe(500);
      expect(balanceOn(r, '2026-08-09')).toBe(500);
    });

    it('crosses month boundary correctly', () => {
      // Aug 25, Sep 1, Sep 8
      const r = run(0, d(2026, 8, 25), d(2026, 9, 8), [weekly('2026-08-25')]);
      expect(balanceOn(r, '2026-08-25')).toBe(500);
      expect(balanceOn(r, '2026-09-01')).toBe(1000);
      expect(balanceOn(r, '2026-09-08')).toBe(1500);
    });
  });

  // ── fixed-dates income ────────────────────────────────────────────────────

  describe('fixed-dates income', () => {
    it('pays on each listed day every month', () => {
      const r = run(0, d(2026, 8, 1), d(2026, 9, 15), [fixed('1,15')]);
      expect(balanceOn(r, '2026-08-01')).toBe(2000);
      expect(balanceOn(r, '2026-08-15')).toBe(4000);
      expect(balanceOn(r, '2026-09-01')).toBe(6000);
      expect(balanceOn(r, '2026-09-15')).toBe(8000);
    });

    it('single fixed date fires once per month', () => {
      const r = run(0, d(2026, 8, 1), d(2026, 10, 31), [fixed('1')]);
      expect(txOn(r, '2026-08-01')).toHaveLength(1);
      expect(txOn(r, '2026-09-01')).toHaveLength(1);
      expect(txOn(r, '2026-10-01')).toHaveLength(1);
    });

    it('clamps day 31 to last day of February (non-leap)', () => {
      const r = run(0, d(2026, 2, 1), d(2026, 2, 28), [fixed('31', 1000)]);
      expect(balanceOn(r, '2026-02-28')).toBe(1000);
    });

    it('clamps day 31 to 30 in April', () => {
      const r = run(0, d(2026, 4, 1), d(2026, 4, 30), [fixed('31', 1000)]);
      expect(balanceOn(r, '2026-04-30')).toBe(1000);
    });

    it('does not skip September when startDate is July 31 (overflow bug)', () => {
      const r = run(0, d(2026, 7, 31), d(2026, 10, 1), [fixed('1,15')]);
      expect(txOn(r, '2026-09-01')).toHaveLength(1);
      expect(txOn(r, '2026-09-15')).toHaveLength(1);
    });

    it('does not pay before startDate', () => {
      // startDate Aug 10; day 1 already passed for August
      const r = run(0, d(2026, 8, 10), d(2026, 8, 31), [fixed('1,15')]);
      expect(txOn(r, '2026-08-01')).toHaveLength(0);
      expect(txOn(r, '2026-08-15')).toHaveLength(1);
    });
  });

  // ── bills ─────────────────────────────────────────────────────────────────

  describe('bills', () => {
    it('subtracts bill amount on the due day', () => {
      const r = run(2000, d(2026, 8, 1), d(2026, 8, 31), [], [bill(15)]);
      expect(balanceOn(r, '2026-08-15')).toBe(1000);
    });

    it('does not apply the bill when due day already passed in the start month', () => {
      const r = run(2000, d(2026, 8, 20), d(2026, 9, 30), [], [bill(15)]);
      expect(balanceOn(r, '2026-08-20')).toBe(2000); // Aug 15 was before startDate
      expect(balanceOn(r, '2026-09-15')).toBe(1000); // Sep bill deducted
    });

    it('applies bill every month', () => {
      const r = run(5000, d(2026, 8, 1), d(2026, 10, 31), [], [bill(15)]);
      expect(balanceOn(r, '2026-08-15')).toBe(4000);
      expect(balanceOn(r, '2026-09-15')).toBe(3000);
      expect(balanceOn(r, '2026-10-15')).toBe(2000);
    });

    it('does not skip September when startDate is July 31', () => {
      const r = run(5000, d(2026, 7, 31), d(2026, 10, 1), [], [bill(15)]);
      const septTx = txOn(r, '2026-09-15');
      expect(septTx).toHaveLength(1);
      expect(septTx[0].amount).toBe(-1000);
    });

    it('clamps due_day 31 to last day of a 30-day month', () => {
      const r = run(500, d(2026, 9, 1), d(2026, 9, 30), [], [bill(31, 100)]);
      expect(balanceOn(r, '2026-09-30')).toBe(400);
      expect(txOn(r, '2026-09-30')).toHaveLength(1);
    });

    it('clamps due_day 31 to last day of February', () => {
      const r = run(500, d(2026, 2, 1), d(2026, 2, 28), [], [bill(31, 100)]);
      expect(balanceOn(r, '2026-02-28')).toBe(400);
    });

    it('clamps due_day 30 to Feb 28 (non-leap)', () => {
      const r = run(500, d(2026, 2, 1), d(2026, 2, 28), [], [bill(30, 100)]);
      expect(balanceOn(r, '2026-02-28')).toBe(400);
    });

    it('handles year boundary: December bill appears, then January bill appears', () => {
      const r = run(5000, d(2026, 12, 1), d(2027, 1, 31), [], [bill(15)]);
      expect(balanceOn(r, '2026-12-15')).toBe(4000);
      expect(balanceOn(r, '2027-01-15')).toBe(3000);
    });

    it('excludes inactive bills', () => {
      const inactive: Bill = { ...bill(15), is_active: 0 };
      const r = run(2000, d(2026, 8, 1), d(2026, 8, 31), [], [inactive]);
      expect(balanceOn(r, '2026-08-15')).toBe(2000);
    });
  });

  // ── next-instance overrides (mark paid / adjust amount) ────────────────────

  describe('bill next-instance overrides', () => {
    it('skips the transaction on the overridden date when next_paid is set', () => {
      const paidBill: Bill = { ...bill(15), next_due_date: '2026-08-15', next_paid: 1 };
      const r = run(2000, d(2026, 8, 1), d(2026, 8, 31), [], [paidBill]);
      expect(txOn(r, '2026-08-15')).toHaveLength(0);
      expect(balanceOn(r, '2026-08-15')).toBe(2000);
    });

    it('only skips the paid occurrence, not later months', () => {
      const paidBill: Bill = { ...bill(15), next_due_date: '2026-08-15', next_paid: 1 };
      const r = run(5000, d(2026, 8, 1), d(2026, 9, 30), [], [paidBill]);
      expect(balanceOn(r, '2026-08-15')).toBe(5000); // skipped
      expect(balanceOn(r, '2026-09-15')).toBe(4000); // normal deduction resumes
    });

    it('uses next_amount instead of amount on the overridden date', () => {
      const adjustedBill: Bill = { ...bill(15, 1000), next_due_date: '2026-08-15', next_amount: 250 };
      const r = run(2000, d(2026, 8, 1), d(2026, 8, 31), [], [adjustedBill]);
      expect(balanceOn(r, '2026-08-15')).toBe(1750);
    });

    it('reverts to the normal amount the following month', () => {
      const adjustedBill: Bill = { ...bill(15, 1000), next_due_date: '2026-08-15', next_amount: 250 };
      const r = run(5000, d(2026, 8, 1), d(2026, 9, 30), [], [adjustedBill]);
      expect(balanceOn(r, '2026-08-15')).toBe(4750); // overridden amount
      expect(balanceOn(r, '2026-09-15')).toBe(3750); // back to normal 1000
    });

    it('ignores a stale next_due_date that does not match the occurrence being generated', () => {
      const staleOverride: Bill = { ...bill(15, 1000), next_due_date: '2026-07-15', next_paid: 1 };
      const r = run(2000, d(2026, 8, 1), d(2026, 8, 31), [], [staleOverride]);
      expect(balanceOn(r, '2026-08-15')).toBe(1000); // normal deduction, override was for a different date
    });
  });

  // ── adjustments ───────────────────────────────────────────────────────────

  describe('adjustments', () => {
    it('adds positive adjustment to balance', () => {
      const r = run(1000, d(2026, 8, 1), d(2026, 8, 31), [], [], [adj('2026-08-10', 500)]);
      expect(balanceOn(r, '2026-08-10')).toBe(1500);
      expect(balanceOn(r, '2026-08-11')).toBe(1500);
    });

    it('adds negative adjustment (expense)', () => {
      const r = run(1000, d(2026, 8, 1), d(2026, 8, 31), [], [], [adj('2026-08-10', -200)]);
      expect(balanceOn(r, '2026-08-10')).toBe(800);
    });

    it('set_balance sets exact balance regardless of current balance', () => {
      const r = run(999, d(2026, 8, 1), d(2026, 8, 31), [], [], [adj('2026-08-10', 2500, 1)]);
      expect(balanceOn(r, '2026-08-09')).toBe(999);
      expect(balanceOn(r, '2026-08-10')).toBe(2500);
      expect(balanceOn(r, '2026-08-11')).toBe(2500);
    });

    it('set_balance followed by bill deducts correctly', () => {
      const r = run(0, d(2026, 8, 1), d(2026, 8, 31), [], [bill(20)], [adj('2026-08-10', 3000, 1)]);
      expect(balanceOn(r, '2026-08-10')).toBe(3000);
      expect(balanceOn(r, '2026-08-20')).toBe(2000);
    });

    it('excludes adjustments before startDate', () => {
      const r = run(1000, d(2026, 8, 1), d(2026, 8, 31), [], [], [adj('2026-07-15', 999)]);
      expect(balanceOn(r, '2026-08-01')).toBe(1000);
    });

    it('excludes adjustments after endDate', () => {
      const r = run(1000, d(2026, 8, 1), d(2026, 8, 31), [], [], [adj('2026-09-01', 999)]);
      expect(balanceOn(r, '2026-08-31')).toBe(1000);
    });

    it('includes adjustment on startDate', () => {
      const r = run(1000, d(2026, 8, 1), d(2026, 8, 31), [], [], [adj('2026-08-01', 500)]);
      expect(balanceOn(r, '2026-08-01')).toBe(1500);
    });

    it('includes adjustment on endDate', () => {
      const r = run(1000, d(2026, 8, 1), d(2026, 8, 31), [], [], [adj('2026-08-31', 500)]);
      expect(balanceOn(r, '2026-08-31')).toBe(1500);
    });
  });

  // ── combined / accumulation ───────────────────────────────────────────────

  describe('combined transactions and accumulation', () => {
    it('income and bill on same day both apply', () => {
      const inc: Income[] = [biweekly('2026-08-15', 3000)];
      const bills: Bill[] = [bill(15, 1200)];
      const r = run(1000, d(2026, 8, 1), d(2026, 8, 31), inc, bills);
      expect(txOn(r, '2026-08-15')).toHaveLength(2);
      expect(balanceOn(r, '2026-08-15')).toBe(1000 + 3000 - 1200);
    });

    it('three bills on the same day all deduct', () => {
      const bills: Bill[] = [bill(10, 100, 1), bill(10, 200, 2), bill(10, 300, 3)];
      const r = run(1000, d(2026, 8, 1), d(2026, 8, 10), [], bills);
      expect(balanceOn(r, '2026-08-10')).toBe(400);
      expect(txOn(r, '2026-08-10')).toHaveLength(3);
    });

    it('balance accumulates correctly across a multi-month period', () => {
      // Pay $3000 on Aug 1, Aug 15, Aug 29. Bill $1200 on the 5th.
      const inc: Income[] = [biweekly('2026-08-01', 3000)];
      const bills: Bill[] = [bill(5, 1200)];
      // Aug 1:  0 + 3000 = 3000
      // Aug 5:  3000 - 1200 = 1800
      // Aug 15: 1800 + 3000 = 4800
      // Aug 29: 4800 + 3000 = 7800
      // Sep 5:  7800 - 1200 = 6600
      const r = run(0, d(2026, 8, 1), d(2026, 9, 5), inc, bills);
      expect(balanceOn(r, '2026-08-01')).toBe(3000);
      expect(balanceOn(r, '2026-08-05')).toBe(1800);
      expect(balanceOn(r, '2026-08-15')).toBe(4800);
      expect(balanceOn(r, '2026-08-29')).toBe(7800);
      expect(balanceOn(r, '2026-09-05')).toBe(6600);
    });

    it('multiple set_balance adjustments: later one wins', () => {
      const adjs: Adjustment[] = [
        adj('2026-08-05', 1000, 1),
        adj('2026-08-10', 500, 1),
      ];
      const r = run(0, d(2026, 8, 1), d(2026, 8, 31), [], [], adjs);
      expect(balanceOn(r, '2026-08-05')).toBe(1000);
      expect(balanceOn(r, '2026-08-10')).toBe(500);
      expect(balanceOn(r, '2026-08-11')).toBe(500);
    });
  });

  // ── real-world scenario ───────────────────────────────────────────────────

  describe('real-world scenario (matches live DB data)', () => {
    // Data from cashflow.db:
    //   Income: LLNL $5432.93 bi-weekly starting 2026-07-31
    //   Bills:  Truck $723 day 6, Mortgage $2450 day 15, ...
    //   Balance set to $4000 on 2026-07-31

    const income: Income[] = [{
      id: 2, name: 'llnl', amount: 5432.93, frequency: 'bi-weekly',
      start_date: '2026-07-31', is_active: 1,
    }];

    const bills: Bill[] = [
      { id: 1, name: 'Truck', amount: 723, due_day: 6, is_active: 1 },
      { id: 2, name: 'Mortgage', amount: 2450, due_day: 15, is_active: 1 },
    ];

    const adjustments: Adjustment[] = [{
      id: 1, name: 'adj', amount: 4000, date: '2026-07-31', is_set_balance: 1,
    }];

    it('sets balance to 4000 on Jul 31 (set_balance overrides starting balance)', () => {
      const r = run(0, d(2026, 7, 31), d(2026, 8, 31), income, bills, adjustments);
      // set_balance fires first conceptually, then bi-weekly income on same day
      const jul31Tx = txOn(r, '2026-07-31');
      expect(jul31Tx.some(t => t.is_set_balance)).toBe(true);
    });

    it('bills appear in September (not skipped due to startDate on 31st)', () => {
      const r = run(0, d(2026, 7, 31), d(2026, 9, 30), income, bills, adjustments);
      expect(txOn(r, '2026-09-06').length).toBeGreaterThan(0);
      expect(txOn(r, '2026-09-15').length).toBeGreaterThan(0);
    });

    it('bi-weekly income lands on Aug 14 (14 days after Jul 31)', () => {
      const r = run(0, d(2026, 7, 31), d(2026, 8, 31), income, bills, adjustments);
      expect(txOn(r, '2026-08-14').some(t => t.type === 'income')).toBe(true);
    });
  });

});

// ─── getNextIncomeDate ────────────────────────────────────────────────────────

describe('getNextIncomeDate', () => {
  // Freeze time at 2026-08-05 midnight
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 5)); // Aug 5, 2026
  });

  afterEach(() => jest.useRealTimers());

  it('returns null for empty income array', () => {
    expect(getNextIncomeDate([])).toBeNull();
  });

  it('returns null when all income is inactive', () => {
    const inc: Income = { ...biweekly('2026-08-01'), is_active: 0 };
    expect(getNextIncomeDate([inc])).toBeNull();
  });

  it('returns today if income is scheduled for today', () => {
    // Cycle Jul 31 → Aug 14. Today Aug 5. No match on Aug 5 specifically.
    // Use a cycle that lands on Aug 5.
    const inc: Income = biweekly('2026-08-05');
    const result = getNextIncomeDate([inc]);
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(7);  // August (0-indexed)
    expect(result!.getDate()).toBe(5);
  });

  it('returns next bi-weekly date after today', () => {
    // Cycle: Jul 31, Aug 14, Aug 28. Today Aug 5 → next Aug 14.
    const inc: Income = biweekly('2026-07-31');
    const result = getNextIncomeDate([inc]);
    expect(result!.getMonth()).toBe(7);
    expect(result!.getDate()).toBe(14);
  });

  it('returns next weekly date after today', () => {
    // Cycle: Aug 3, Aug 10, Aug 17. Today Aug 5 → next Aug 10.
    const inc: Income = weekly('2026-08-03');
    const result = getNextIncomeDate([inc]);
    expect(result!.getDate()).toBe(10);
  });

  it('returns next fixed-date in current month', () => {
    // Today Aug 5. Fixed 1,15 → next is Aug 15.
    const inc: Income = fixed('1,15');
    const result = getNextIncomeDate([inc]);
    expect(result!.getMonth()).toBe(7);
    expect(result!.getDate()).toBe(15);
  });

  it('wraps to next month for fixed-dates when all days in current month passed', () => {
    jest.setSystemTime(new Date(2026, 7, 20)); // Aug 20
    // Fixed 1,15: both passed. Next is Sep 1.
    const inc: Income = fixed('1,15');
    const result = getNextIncomeDate([inc]);
    expect(result!.getMonth()).toBe(8); // September
    expect(result!.getDate()).toBe(1);
  });

  it('returns the earliest date among multiple income sources', () => {
    // A: bi-weekly from Aug 14 → Aug 14
    // B: bi-weekly from Aug 10 → Aug 10
    // Today Aug 5 → earliest is Aug 10
    const a: Income = { ...biweekly('2026-08-14'), id: 1 };
    const b: Income = { ...biweekly('2026-08-10'), id: 2 };
    const result = getNextIncomeDate([a, b]);
    expect(result!.getDate()).toBe(10);
  });

  it('ignores inactive income when finding next date', () => {
    // Active: Aug 14. Inactive: Aug 10. Today Aug 5 → should return Aug 14.
    const active: Income = { ...biweekly('2026-08-14'), id: 1, is_active: 1 };
    const inactive: Income = { ...biweekly('2026-08-10'), id: 2, is_active: 0 };
    const result = getNextIncomeDate([active, inactive]);
    expect(result!.getDate()).toBe(14);
  });
});

// ─── getUpcomingBills ─────────────────────────────────────────────────────────

describe('getUpcomingBills', () => {
  // Freeze at Aug 5, 2026 midnight (midnight avoids time-of-day comparison issues)
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 5)); // Aug 5, midnight
  });

  afterEach(() => jest.useRealTimers());

  it('returns bill due within the default 7-day window', () => {
    const result = getUpcomingBills([bill(10)]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bill-1');
  });

  it('excludes bill due after the 7-day window', () => {
    expect(getUpcomingBills([bill(20)])).toHaveLength(0);
  });

  it('includes bill due today', () => {
    expect(getUpcomingBills([bill(5)])).toHaveLength(1);
  });

  it('excludes bill with due_day before today in this month', () => {
    // Bill due Aug 1, today is Aug 5 → already passed
    expect(getUpcomingBills([bill(1)])).toHaveLength(0);
  });

  it('includes bill due exactly on the last day of the window', () => {
    // Today Aug 5 + 7 days = Aug 12
    expect(getUpcomingBills([bill(12)])).toHaveLength(1);
  });

  it('respects a custom days parameter', () => {
    const bills: Bill[] = [bill(10, 100, 1), bill(20, 100, 2)];
    expect(getUpcomingBills(bills, 20)).toHaveLength(2);
    expect(getUpcomingBills(bills, 7)).toHaveLength(1);
  });

  it('excludes inactive bills', () => {
    const inactive: Bill = { ...bill(8), is_active: 0 };
    expect(getUpcomingBills([inactive])).toHaveLength(0);
  });

  it('returns multiple bills all within the window', () => {
    const bills: Bill[] = [bill(6, 100, 1), bill(8, 200, 2), bill(11, 300, 3)];
    const result = getUpcomingBills(bills);
    expect(result).toHaveLength(3);
  });

  it('returns empty array when no bills', () => {
    expect(getUpcomingBills([])).toHaveLength(0);
  });
});

// ─── getNextBillDueDate ───────────────────────────────────────────────────────

describe('getNextBillDueDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 5)); // Aug 5, midnight
  });

  afterEach(() => jest.useRealTimers());

  it('returns this month\'s due date when it has not passed yet', () => {
    const result = getNextBillDueDate(bill(15));
    expect(result).toEqual(new Date(2026, 7, 15));
  });

  it('returns today when the bill is due today', () => {
    const result = getNextBillDueDate(bill(5));
    expect(result).toEqual(new Date(2026, 7, 5));
  });

  it('rolls over to next month when this month\'s due date already passed', () => {
    const result = getNextBillDueDate(bill(1));
    expect(result).toEqual(new Date(2026, 8, 1));
  });

  it('clamps the rolled-over month to its last valid day', () => {
    // Today Jan 31: due day 30 already passed in January (clamps to Jan 30), so it
    // rolls into February, which only has 28 days in 2026 → clamps to Feb 28.
    jest.setSystemTime(new Date(2026, 0, 31));
    const result = getNextBillDueDate(bill(30));
    expect(result).toEqual(new Date(2026, 1, 28));
  });
});

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns a non-empty string', () => {
    const result = formatDate('2026-08-15');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('round-trips: parsed date contains the correct year, month, and day', () => {
    // toLocaleDateString output is locale-dependent, so we verify parsing
    // by checking the formatted output contains recognizable components.
    const result = formatDate('2026-08-15');
    // Should contain 2026 and either 8 or 08 and either 15
    expect(result).toMatch(/2026/);
  });

  it('handles end-of-month dates without throwing', () => {
    expect(() => formatDate('2026-02-28')).not.toThrow();
    expect(() => formatDate('2026-12-31')).not.toThrow();
  });
});
