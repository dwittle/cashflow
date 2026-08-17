import React, { useRef, useState } from 'react';
import { Income, Bill, Adjustment, BackupData } from '../types';

interface Props {
  income: Income[];
  bills: Bill[];
  adjustments: Adjustment[];
  onUpdate: () => void;
}

function isBackupData(value: unknown): value is BackupData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.income) && Array.isArray(v.bills) && Array.isArray(v.adjustments);
}

function DataForm({ income, bills, adjustments, onUpdate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExport = async () => {
    setStatus(null);
    const data = await window.electron.data.exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setStatus({ type: 'success', message: `Exported ${data.income.length} income source(s), ${data.bills.length} bill(s), and ${data.adjustments.length} adjustment(s).` });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setStatus(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setStatus({ type: 'error', message: 'Import failed: that file is not valid JSON.' });
      return;
    }

    if (!isBackupData(parsed)) {
      setStatus({ type: 'error', message: 'Import failed: that file is not a CashFlow Tracker backup.' });
      return;
    }

    const confirmed = window.confirm(
      `This will REPLACE all current data (${income.length} income source(s), ${bills.length} bill(s), ${adjustments.length} adjustment(s)) ` +
      `with the contents of "${file.name}" (${parsed.income.length} income source(s), ${parsed.bills.length} bill(s), ${parsed.adjustments.length} adjustment(s)).\n\n` +
      `This cannot be undone. Continue?`
    );
    if (!confirmed) return;

    await window.electron.data.importAll(parsed);
    onUpdate();
    setStatus({ type: 'success', message: `Imported ${parsed.income.length} income source(s), ${parsed.bills.length} bill(s), and ${parsed.adjustments.length} adjustment(s).` });
  };

  return (
    <div>
      <div className="card">
        <h2>Export Data</h2>
        <p>Save a complete backup of your income, bills, and adjustments to a JSON file.</p>
        <button className="btn btn-primary" onClick={handleExport}>Export to File</button>
      </div>

      <div className="card">
        <h2>Import Data</h2>
        <p>Restore from a previously exported backup file. This replaces all current data.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
        <button className="btn btn-danger" onClick={handleImportClick}>Import from File</button>
      </div>

      {status && (
        <div
          className="card"
          style={
            status.type === 'success'
              ? { background: '#e8f5e9', border: '1px solid #4caf50' }
              : { background: '#fdecea', border: '1px solid #e53935' }
          }
        >
          {status.message}
        </div>
      )}
    </div>
  );
}

export default DataForm;
