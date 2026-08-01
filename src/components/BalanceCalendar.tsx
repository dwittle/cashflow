import React, { useState } from 'react';
import { DailyBalance } from '../types';

interface Props {
  data: DailyBalance[];
}

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Grey at 0, interpolates toward dark green (positive) or dark red (negative)
const GREY  = [180, 180, 180];
const GREEN = [14,  110,  40];
const RED   = [160,  20,  20];

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function balanceBg(balance: number): string {
  if (balance >= 0) {
    const t = Math.min(balance / 10000, 1);
    return `rgb(${lerp(GREY[0], GREEN[0], t)},${lerp(GREY[1], GREEN[1], t)},${lerp(GREY[2], GREEN[2], t)})`;
  } else {
    const t = Math.min(-balance / 1000, 1);
    return `rgb(${lerp(GREY[0], RED[0], t)},${lerp(GREY[1], RED[1], t)},${lerp(GREY[2], RED[2], t)})`;
  }
}

// Switch to white text once background gets dark enough
function cellTextColor(balance: number): string {
  const t = balance >= 0
    ? Math.min(balance / 10000, 1)
    : Math.min(-balance / 1000, 1);
  return t > 0.45 ? 'white' : '#2c3e50';
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function BalanceCalendar({ data }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const dataMap = new Map(data.map(d => [d.date, d]));
  const todayStr = toLocalDateStr(today);

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDow = firstOfMonth.getDay();
  const monthLabel = firstOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const minDate = data[0]?.date;
  const maxDate = data[data.length - 1]?.date;

  const currentMonthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const prevDisabled = !minDate || currentMonthStr <= minDate.slice(0, 7);
  const nextDisabled = !maxDate || currentMonthStr >= maxDate.slice(0, 7);

  const navigate = (dir: -1 | 1) => {
    const d = new Date(viewYear, viewMonth + dir, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const cells: Array<{ day: number; dateStr: string; entry: DailyBalance | undefined } | null> = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr, entry: dataMap.get(dateStr) });
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} disabled={prevDisabled}>&#8592;</button>
        <h2 style={{ margin: 0 }}>{monthLabel}</h2>
        <button className="btn btn-secondary" onClick={() => navigate(1)} disabled={nextDisabled}>&#8594;</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {DOW_LABELS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', padding: '0.25rem 0', color: '#7f8c8d' }}>
            {d}
          </div>
        ))}

        {cells.map((cell, i) => {
          const textColor = cell?.entry ? cellTextColor(cell.entry.balance) : '#2c3e50';
          return (
            <div
              key={i}
              style={{
                minHeight: '72px',
                padding: '0.35rem 0.4rem',
                borderRadius: '4px',
                background: cell ? (cell.entry ? balanceBg(cell.entry.balance) : '#ebebeb') : 'transparent',
                border: cell?.dateStr === todayStr ? '2px solid #3498db' : '1px solid rgba(0,0,0,0.08)',
                visibility: cell ? 'visible' : 'hidden',
              }}
            >
              {cell && (
                <>
                  <div style={{ fontSize: '0.75rem', fontWeight: cell.dateStr === todayStr ? 700 : 500, color: cell.entry ? textColor : '#999' }}>
                    {cell.day}
                  </div>
                  {cell.entry ? (
                    <>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: textColor, marginTop: '0.2rem' }}>
                        ${cell.entry.balance.toFixed(0)}
                      </div>
                      {cell.entry.transactions.length > 0 && (
                        <div style={{ marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                          {cell.entry.transactions.map((t, ti) => (
                            <span
                              key={ti}
                              title={`${t.name}: ${t.amount >= 0 ? '+' : ''}$${t.amount.toFixed(2)}`}
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: t.amount >= 0 ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.25)',
                                border: '1px solid rgba(255,255,255,0.4)',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: '0.7rem', color: '#bbb', marginTop: '0.2rem' }}>—</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.78rem', color: '#555' }}>
        <span style={{ background: balanceBg(-1000), width: 14, height: 14, borderRadius: 2, display: 'inline-block' }} />
        <span>-$1k</span>
        {[-500, -100, 0, 1000, 3000, 5000, 10000].map(v => (
          <React.Fragment key={v}>
            <span style={{ background: balanceBg(v), width: 14, height: 14, borderRadius: 2, display: 'inline-block', border: '1px solid rgba(0,0,0,0.08)' }} />
            <span>{v === 0 ? '$0' : v >= 1000 ? `$${v / 1000}k` : `$${v}`}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default BalanceCalendar;
