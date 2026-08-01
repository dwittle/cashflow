import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Income, Bill, Adjustment } from '../types';
import { calculateProjectedBalances, getNextIncomeDate, getUpcomingBills } from '../utils/calculations';
import BalanceCalendar from './BalanceCalendar';

interface Props {
  startingBalance: number;
  setStartingBalance: (balance: number) => void;
  income: Income[];
  bills: Bill[];
  adjustments: Adjustment[];
}

function Dashboard({ startingBalance, setStartingBalance, income, bills, adjustments }: Props) {
  const dailyBalances = useMemo(() => {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);
    return calculateProjectedBalances(startingBalance, today, endDate, income, bills, adjustments);
  }, [startingBalance, income, bills, adjustments]);

  const projectedData = useMemo(() =>
    dailyBalances.map(day => ({ date: day.date, balance: parseFloat(day.balance.toFixed(2)) })),
    [dailyBalances]
  );

  const currentBalance = projectedData[0]?.balance || startingBalance;
  const nextIncome = getNextIncomeDate(income);
  const upcomingBills = getUpcomingBills(bills, 7);

  const minBalance = Math.min(...projectedData.map(d => d.balance));
  const hasLowBalance = minBalance < 100;

  return (
    <div>
      <div className="stats">
        <div className="stat-card">
          <div className="stat-label">Current Balance</div>
          <div className={`stat-value ${currentBalance >= 0 ? 'amount-positive' : 'amount-negative'}`}>
            ${currentBalance.toFixed(2)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Next Income</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {nextIncome ? nextIncome.toLocaleDateString() : 'No income set'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Upcoming Bills (7 days)</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {upcomingBills.length} bills
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Starting Balance</div>
          <input
            type="number"
            value={startingBalance}
            onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
            style={{ fontSize: '1.25rem', fontWeight: 600, padding: '0.25rem' }}
          />
        </div>
      </div>

      {hasLowBalance && (
        <div className="card" style={{ background: '#fff3cd', border: '1px solid #ffc107' }}>
          <strong>Warning:</strong> Your balance is projected to drop below $100 within the next 90 days.
        </div>
      )}

      <div className="card">
        <h2>90-Day Balance Projection</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={projectedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(dateStr) => {
                const [y, m, d] = dateStr.split('-').map(Number);
                return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis tickFormatter={(value) => `$${value}`} />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Balance']}
              labelFormatter={(dateStr) => {
                const [y, m, d] = dateStr.split('-').map(Number);
                return new Date(y, m - 1, d).toLocaleDateString();
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="balance" stroke="#3498db" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <BalanceCalendar data={dailyBalances} />

      {upcomingBills.length > 0 && (
        <div className="card">
          <h2>Upcoming Bills (Next 7 Days)</h2>
          <ul className="list">
            {upcomingBills.map(bill => (
              <li key={bill.id} className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">{bill.name}</div>
                  <div className="list-item-details">Due day: {bill.due_day}</div>
                </div>
                <div className="amount-negative">${bill.amount.toFixed(2)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
