import React, { useState } from 'react';
import { Income } from '../types';

interface Props {
  income: Income[];
  onUpdate: () => void;
}

function IncomeForm({ income, onUpdate }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'bi-weekly' | 'fixed-dates'>('bi-weekly');
  const [startDate, setStartDate] = useState('');
  const [fixedDates, setFixedDates] = useState('1,15');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    if (frequency !== 'fixed-dates' && !startDate) return;
    if (frequency === 'fixed-dates' && !fixedDates) return;

    await window.electron.income.create({
      name,
      amount: parseFloat(amount),
      frequency,
      start_date: frequency !== 'fixed-dates' ? startDate : undefined,
      fixed_dates: frequency === 'fixed-dates' ? fixedDates : undefined,
      is_active: 1
    });

    setName('');
    setAmount('');
    setStartDate('');
    setFixedDates('1,15');
    onUpdate();
  };

  const handleDelete = async (id: number) => {
    await window.electron.income.delete(id);
    onUpdate();
  };

  const handleToggleActive = async (inc: Income) => {
    await window.electron.income.update(inc.id!, { is_active: inc.is_active ? 0 : 1 });
    onUpdate();
  };

  return (
    <div>
      <div className="card">
        <h2>Add Income Source</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Salary"
              required
            />
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="form-group">
            <label>Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
              <option value="weekly">Weekly (every 7 days)</option>
              <option value="bi-weekly">Bi-weekly (every 14 days)</option>
              <option value="fixed-dates">Fixed dates each month</option>
            </select>
          </div>
          {frequency !== 'fixed-dates' ? (
            <div className="form-group">
              <label>First Payment Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label>Payment Days of Month (comma-separated)</label>
              <input
                type="text"
                value={fixedDates}
                onChange={(e) => setFixedDates(e.target.value)}
                placeholder="e.g., 1,15"
                required
              />
              <small style={{ color: '#7f8c8d', marginTop: '0.25rem', display: 'block' }}>
                Enter day numbers (1-31) separated by commas
              </small>
            </div>
          )}
          <button type="submit" className="btn btn-primary">Add Income</button>
        </form>
      </div>

      <div className="card">
        <h2>Income Sources</h2>
        {income.length === 0 ? (
          <p>No income sources yet. Add one above.</p>
        ) : (
          <ul className="list">
            {income.map(inc => (
              <li key={inc.id} className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">{inc.name}</div>
                  <div className="list-item-details">
                    {inc.frequency === 'weekly' && `Weekly starting ${new Date(inc.start_date!).toLocaleDateString()}`}
                    {inc.frequency === 'bi-weekly' && `Bi-weekly starting ${new Date(inc.start_date!).toLocaleDateString()}`}
                    {inc.frequency === 'fixed-dates' && `Days ${inc.fixed_dates} of each month`}
                    {!inc.is_active && ' (Inactive)'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="amount-positive">${inc.amount.toFixed(2)}</div>
                  <div className="list-item-actions">
                    <button
                      className={`btn ${inc.is_active ? 'btn-secondary' : 'btn-success'}`}
                      onClick={() => handleToggleActive(inc)}
                    >
                      {inc.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(inc.id!)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default IncomeForm;
