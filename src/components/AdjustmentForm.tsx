import React, { useState } from 'react';
import { Adjustment } from '../types';
import { formatDate } from '../utils/calculations';

type AdjustmentType = 'expense' | 'income' | 'set';

interface Props {
  adjustments: Adjustment[];
  onUpdate: () => void;
}

function AdjustmentForm({ adjustments, onUpdate }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<AdjustmentType>('expense');

  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  const handleTypeChange = (newType: AdjustmentType) => {
    setType(newType);
    if (newType === 'set' && !date) setDate(today);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !date) return;

    let adjustmentAmount: number;
    let isSetBalance = 0;

    if (type === 'set') {
      adjustmentAmount = Math.abs(parseFloat(amount));
      isSetBalance = 1;
    } else if (type === 'expense') {
      adjustmentAmount = -Math.abs(parseFloat(amount));
    } else {
      adjustmentAmount = Math.abs(parseFloat(amount));
    }

    await window.electron.adjustments.create({
      name,
      amount: adjustmentAmount,
      date,
      is_set_balance: isSetBalance
    });

    setName('');
    setAmount('');
    setDate('');
    onUpdate();
  };

  const handleDelete = async (id: number) => {
    await window.electron.adjustments.delete(id);
    onUpdate();
  };

  return (
    <div>
      <div className="card">
        <h2>Add One-Time Adjustment</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Car Repair"
              required
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={(e) => handleTypeChange(e.target.value as AdjustmentType)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="set">Set Balance</option>
            </select>
          </div>
          <div className="form-group">
            <label>{type === 'set' ? 'New Balance' : 'Amount'}</label>
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
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Add Adjustment</button>
        </form>
      </div>

      <div className="card">
        <h2>Recent Adjustments</h2>
        {adjustments.length === 0 ? (
          <p>No adjustments yet. Add one above.</p>
        ) : (
          <ul className="list">
            {adjustments.map(adj => (
              <li key={adj.id} className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">{adj.name}</div>
                  <div className="list-item-details">
                    {formatDate(adj.date)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className={adj.is_set_balance ? 'amount-positive' : adj.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
                    {adj.is_set_balance
                      ? `set to $${adj.amount.toFixed(2)}`
                      : `$${Math.abs(adj.amount).toFixed(2)} (${adj.amount >= 0 ? 'income' : 'expense'})`}
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(adj.id!)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AdjustmentForm;
