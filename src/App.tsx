import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import IncomeForm from './components/IncomeForm';
import BillForm from './components/BillForm';
import AdjustmentForm from './components/AdjustmentForm';
import DataForm from './components/DataForm';
import { Income, Bill, Adjustment } from './types';
import './App.css';

type View = 'dashboard' | 'income' | 'bills' | 'adjustments' | 'data';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [startingBalance, setStartingBalance] = useState<number>(1000);
  const [income, setIncome] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [incomeData, billsData, adjustmentsData] = await Promise.all([
      window.electron.income.getAll(),
      window.electron.bills.getAll(),
      window.electron.adjustments.getAll()
    ]);
    setIncome(incomeData);
    setBills(billsData);
    setAdjustments(adjustmentsData);
  };

  return (
    <div className="app">
      <nav className="nav">
        <h1>CashFlow Tracker</h1>
        <div className="nav-buttons">
          <button
            className={currentView === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={currentView === 'income' ? 'active' : ''}
            onClick={() => setCurrentView('income')}
          >
            Income
          </button>
          <button
            className={currentView === 'bills' ? 'active' : ''}
            onClick={() => setCurrentView('bills')}
          >
            Bills
          </button>
          <button
            className={currentView === 'adjustments' ? 'active' : ''}
            onClick={() => setCurrentView('adjustments')}
          >
            Adjustments
          </button>
          <button
            className={currentView === 'data' ? 'active' : ''}
            onClick={() => setCurrentView('data')}
          >
            Data
          </button>
        </div>
      </nav>

      <main className="main">
        {currentView === 'dashboard' && (
          <Dashboard
            startingBalance={startingBalance}
            setStartingBalance={setStartingBalance}
            income={income}
            bills={bills}
            adjustments={adjustments}
          />
        )}
        {currentView === 'income' && (
          <IncomeForm income={income} onUpdate={loadData} />
        )}
        {currentView === 'bills' && (
          <BillForm bills={bills} onUpdate={loadData} />
        )}
        {currentView === 'adjustments' && (
          <AdjustmentForm adjustments={adjustments} onUpdate={loadData} />
        )}
        {currentView === 'data' && (
          <DataForm income={income} bills={bills} adjustments={adjustments} onUpdate={loadData} />
        )}
      </main>
    </div>
  );
}

export default App;
