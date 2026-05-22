import React from 'react';
import { todayISO, addDays } from '../utils/dateUtils.js';

const PRESETS = [
  { id: '7d', label: '최근 7일', days: 7 },
  { id: '30d', label: '최근 30일', days: 30 },
  { id: '90d', label: '최근 90일', days: 90 },
  { id: '365d', label: '최근 1년', days: 365 },
  { id: 'all', label: '전체' }
];

export default function PeriodFilter({
  granularity,
  onGranularityChange,
  from,
  to,
  onRangeChange,
  dataRange,
  businesses,
  selectedBusinesses,
  onBusinessesChange
}) {
  const applyPreset = (preset) => {
    if (preset.id === 'all') {
      onRangeChange({ from: dataRange.min || '', to: dataRange.max || '' });
    } else {
      const today = dataRange.max || todayISO();
      onRangeChange({ from: addDays(today, -(preset.days - 1)), to: today });
    }
  };

  return (
    <div className="toolbar">
      <div className="filter-group">
        <label>기간 단위</label>
        <div className="segmented">
          {['day', 'week', 'month', 'year'].map((g) => (
            <button
              key={g}
              className={granularity === g ? 'active' : ''}
              onClick={() => onGranularityChange(g)}
            >
              {g === 'day' ? '일일' : g === 'week' ? '주간' : g === 'month' ? '월별' : '연간'}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label>기간</label>
        <input
          type="date"
          className="input"
          value={from}
          min={dataRange.min || undefined}
          max={dataRange.max || undefined}
          onChange={(e) => onRangeChange({ from: e.target.value, to })}
        />
        <span className="muted">~</span>
        <input
          type="date"
          className="input"
          value={to}
          min={dataRange.min || undefined}
          max={dataRange.max || undefined}
          onChange={(e) => onRangeChange({ from, to: e.target.value })}
        />
        {PRESETS.map((p) => (
          <button key={p.id} className="btn sm" onClick={() => applyPreset(p)}>
            {p.label}
          </button>
        ))}
      </div>

      {businesses.length > 0 && (
        <div className="filter-group">
          <label>사업자</label>
          <div className="segmented">
            <button
              className={selectedBusinesses.length === 0 ? 'active' : ''}
              onClick={() => onBusinessesChange([])}
            >
              전체
            </button>
            {businesses.map((b) => (
              <button
                key={b}
                className={selectedBusinesses.includes(b) ? 'active' : ''}
                onClick={() =>
                  onBusinessesChange(
                    selectedBusinesses.includes(b)
                      ? selectedBusinesses.filter((x) => x !== b)
                      : [...selectedBusinesses, b]
                  )
                }
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
