import React from 'react';
import { Transaction } from '../types';
import { formatDate } from '../utils/calculations';

interface Props {
  transactions: Transaction[];
}

function TransactionList({ transactions }: Props) {
  const sortedTransactions = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <div className="card">
      <h2>Transaction History</h2>
      {sortedTransactions.length === 0 ? (
        <p>No transactions to display.</p>
      ) : (
        <ul className="list">
          {sortedTransactions.map((t, idx) => (
            <li key={idx} className="list-item">
              <div className="list-item-info">
                <div className="list-item-name">{t.name}</div>
                <div className="list-item-details">
                  {formatDate(t.date)} - {t.type}
                </div>
              </div>
              <div className={t.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
                ${Math.abs(t.amount).toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TransactionList;
