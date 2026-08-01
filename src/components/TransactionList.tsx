import React from 'react';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
}

function TransactionList({ transactions }: Props) {
  const sortedTransactions = [...transactions].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
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
                  {new Date(t.date).toLocaleDateString()} - {t.type}
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
