import React, { useState } from 'react';
import { Bill } from '../types';
import { getNextBillDueDate, toLocalDateStr, formatDate } from '../utils/calculations';

interface Props {
  bills: Bill[];
  onUpdate: () => void;
}

interface EditState {
  name: string;
  amount: string;
  dueDay: string;
}

function BillForm({ bills, onUpdate }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !dueDay) return;

    await window.electron.bills.create({
      name,
      amount: parseFloat(amount),
      due_day: parseInt(dueDay),
      is_active: 1
    });

    setName('');
    setAmount('');
    setDueDay('');
    onUpdate();
  };

  const handleDelete = async (bill: Bill) => {
    if (!window.confirm(`Delete "${bill.name}"? This cannot be undone.`)) return;
    await window.electron.bills.delete(bill.id!);
    onUpdate();
  };

  const handleToggleActive = async (bill: Bill) => {
    await window.electron.bills.update(bill.id!, { is_active: bill.is_active ? 0 : 1 });
    onUpdate();
  };

  const startEdit = (bill: Bill) => {
    setEditingId(bill.id!);
    setEditState({
      name: bill.name,
      amount: String(bill.amount),
      dueDay: String(bill.due_day),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(null);
  };

  const saveEdit = async (id: number) => {
    if (!editState) return;
    await window.electron.bills.update(id, {
      name: editState.name,
      amount: parseFloat(editState.amount),
      due_day: parseInt(editState.dueDay),
    });
    setEditingId(null);
    setEditState(null);
    onUpdate();
  };

  const handleMarkPaid = async (bill: Bill) => {
    const nextDueDateStr = toLocalDateStr(getNextBillDueDate(bill));
    await window.electron.bills.update(bill.id!, {
      next_due_date: nextDueDateStr,
      next_paid: 1,
    });
    onUpdate();
  };

  const handleUnmarkPaid = async (bill: Bill) => {
    await window.electron.bills.update(bill.id!, {
      next_due_date: null,
      next_amount: null,
      next_paid: 0,
    });
    onUpdate();
  };

  const startAdjustAmount = (bill: Bill) => {
    setAdjustingId(bill.id!);
    setAdjustAmount(String(bill.next_amount ?? bill.amount));
  };

  const cancelAdjustAmount = () => {
    setAdjustingId(null);
    setAdjustAmount('');
  };

  const saveAdjustAmount = async (bill: Bill) => {
    if (!adjustAmount) return;
    const nextDueDateStr = toLocalDateStr(getNextBillDueDate(bill));
    await window.electron.bills.update(bill.id!, {
      next_due_date: nextDueDateStr,
      next_amount: parseFloat(adjustAmount),
    });
    setAdjustingId(null);
    setAdjustAmount('');
    onUpdate();
  };

  const clearAdjustedAmount = async (bill: Bill) => {
    await window.electron.bills.update(bill.id!, { next_amount: null });
    onUpdate();
  };

  // The stored override only applies once its date is still the bill's next
  // upcoming occurrence — once that date passes, the next occurrence rolls
  // forward and the override is inert (kept around, but no longer shown as active).
  const activeOverride = (bill: Bill) => {
    const nextDueDateStr = toLocalDateStr(getNextBillDueDate(bill));
    return bill.next_due_date === nextDueDateStr ? bill : null;
  };

  return (
    <div>
      <div className="card">
        <h2>Add Monthly Bill</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Rent"
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
            <label>Due Day (1-31)</label>
            <input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="1"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Add Bill</button>
        </form>
      </div>

      <div className="card">
        <h2>Monthly Bills</h2>
        {bills.length === 0 ? (
          <p>No bills yet. Add one above.</p>
        ) : (
          <ul className="list">
            {bills.map(bill => (
              <li key={bill.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                {editingId === bill.id && editState ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Name</label>
                        <input type="text" value={editState.name} onChange={(e) => setEditState({ ...editState, name: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Amount</label>
                        <input type="number" step="0.01" value={editState.amount} onChange={(e) => setEditState({ ...editState, amount: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Due Day</label>
                        <input type="number" min="1" max="31" value={editState.dueDay} onChange={(e) => setEditState({ ...editState, dueDay: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary" onClick={() => saveEdit(bill.id!)}>Save</button>
                      <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="list-item-info">
                        <div className="list-item-name">{bill.name}</div>
                        <div className="list-item-details">
                          Due on day {bill.due_day} of each month
                          {!bill.is_active && ' (Inactive)'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="amount-negative">${bill.amount.toFixed(2)}</div>
                        <div className="list-item-actions">
                          <button className="btn btn-secondary" onClick={() => startEdit(bill)}>Edit</button>
                          <button
                            className={`btn ${bill.is_active ? 'btn-secondary' : 'btn-success'}`}
                            onClick={() => handleToggleActive(bill)}
                          >
                            {bill.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button className="btn btn-danger" onClick={() => handleDelete(bill)}>Delete</button>
                        </div>
                      </div>
                    </div>

                    {bill.is_active && (() => {
                      const override = activeOverride(bill);
                      const nextDueDate = getNextBillDueDate(bill);
                      const isPaid = !!override?.next_paid;
                      const adjustedAmount = !isPaid && override?.next_amount != null ? override.next_amount : null;

                      return (
                        <div
                          style={{
                            marginTop: '0.75rem',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid #eee',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                          }}
                        >
                          <div className="list-item-details">
                            Next due {formatDate(toLocalDateStr(nextDueDate))}
                            {isPaid && ' — Paid'}
                            {adjustedAmount != null && ` — Adjusted to $${adjustedAmount.toFixed(2)} (this time only)`}
                          </div>

                          {adjustingId === bill.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="number"
                                step="0.01"
                                value={adjustAmount}
                                onChange={(e) => setAdjustAmount(e.target.value)}
                                style={{ width: '7rem' }}
                              />
                              <button className="btn btn-primary" onClick={() => saveAdjustAmount(bill)}>Save</button>
                              <button className="btn btn-secondary" onClick={cancelAdjustAmount}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {isPaid ? (
                                <button className="btn btn-secondary" onClick={() => handleUnmarkPaid(bill)}>Unmark Paid</button>
                              ) : (
                                <>
                                  <button className="btn btn-success" onClick={() => handleMarkPaid(bill)}>Mark Paid</button>
                                  <button className="btn btn-secondary" onClick={() => startAdjustAmount(bill)}>
                                    {adjustedAmount != null ? 'Edit Amount' : 'Adjust Amount'}
                                  </button>
                                  {adjustedAmount != null && (
                                    <button className="btn btn-secondary" onClick={() => clearAdjustedAmount(bill)}>Reset Amount</button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default BillForm;
