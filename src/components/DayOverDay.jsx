import React, { useMemo } from 'react';
import { aggregate, groupByBusiness } from '../utils/analytics.js';
import { fmtKRW, fmtPct, fmtDelta } from '../utils/format.js';
import { addDays, fmtKDate, parseDate, todayISO } from '../utils/dateUtils.js';

export default function DayOverDay({ rows, dataRange }) {
  const latest = dataRange.max || todayISO();
  const prev = addDays(latest, -1);
  const prevWeek = addDays(latest, -7);

  const todayRows = useMemo(() => rows.filter((r) => r.date === latest), [rows, latest]);
  const ydayRows = useMemo(() => rows.filter((r) => r.date === prev), [rows, prev]);
  const lwRows = useMemo(() => rows.filter((r) => r.date === prevWeek), [rows, prevWeek]);

  const today = aggregate(todayRows);
  const yday = aggregate(ydayRows);
  const lw = aggregate(lwRows);

  const todayBiz = groupByBusiness(todayRows);
  const ydayBizMap = new Map(groupByBusiness(ydayRows).map((b) => [b.business, b]));

  const dRev = fmtDelta(today.revenue, yday.revenue);
  const dCost = fmtDelta(today.cost, yday.cost);
  const dMargin = fmtDelta(today.margin, yday.margin);
  const dRevWeek = fmtDelta(today.revenue, lw.revenue);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">📅 전일 대비 증감</div>
          <div className="card-subtitle">
            기준일: <strong>{fmtKDate(parseDate(latest))}</strong> · 비교: 전일 {prev} / 전주 동요일 {prevWeek}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12
        }}
      >
        <DodCard
          label="매출"
          today={today.revenue}
          yday={yday.revenue}
          delta={dRev}
          extraLabel="전주 동요일"
          extraDelta={dRevWeek}
        />
        <DodCard label="매입" today={today.cost} yday={yday.cost} delta={dCost} reverse />
        <DodCard label="순마진" today={today.margin} yday={yday.margin} delta={dMargin} />
        <DodCardPct
          label="마진율"
          today={today.marginRate}
          yday={yday.marginRate}
        />
      </div>

      {todayBiz.length > 0 && (
        <>
          <div style={{ marginTop: 18, marginBottom: 8, fontWeight: 700, fontSize: 13 }}>
            사업자별 전일 대비
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>사업자</th>
                <th>금일 매출</th>
                <th>전일 매출</th>
                <th>전일 대비</th>
                <th>금일 마진</th>
                <th>전일 마진</th>
                <th>전일 대비</th>
              </tr>
            </thead>
            <tbody>
              {todayBiz.map((b) => {
                const y = ydayBizMap.get(b.business) || { revenue: 0, margin: 0 };
                const drev = fmtDelta(b.revenue, y.revenue);
                const dmrg = fmtDelta(b.margin, y.margin);
                return (
                  <tr key={b.business}>
                    <td><strong>{b.business}</strong></td>
                    <td className="num">{fmtKRW(b.revenue)}</td>
                    <td className="num">{fmtKRW(y.revenue)}</td>
                    <td>{drev && <span className={drev.value >= 0 ? 'num pos' : 'num neg'}>{drev.label}</span>}</td>
                    <td className={`num ${b.margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(b.margin)}</td>
                    <td className="num">{fmtKRW(y.margin)}</td>
                    <td>{dmrg && <span className={dmrg.value >= 0 ? 'num pos' : 'num neg'}>{dmrg.label}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function DodCard({ label, today, yday, delta, reverse, extraLabel, extraDelta }) {
  // reverse=true means lower is better (e.g., cost)
  const isUp = delta && delta.value >= 0;
  const goodColor = reverse ? !isUp : isUp;
  return (
    <div
      style={{
        background: '#f8fafc',
        borderRadius: 8,
        padding: 14,
        border: '1px solid var(--border)'
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtKRW(today)}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
        전일 {fmtKRW(yday)}
      </div>
      {delta && (
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            fontWeight: 700,
            color: goodColor ? 'var(--success)' : 'var(--danger)'
          }}
        >
          {isUp ? '▲' : '▼'} {delta.label}
        </div>
      )}
      {extraLabel && extraDelta && (
        <div style={{ fontSize: 11.5, marginTop: 3 }}>
          <span className="muted">{extraLabel}: </span>
          <span style={{ color: extraDelta.value >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
            {extraDelta.label}
          </span>
        </div>
      )}
    </div>
  );
}

function DodCardPct({ label, today, yday }) {
  const diff = today - yday;
  return (
    <div
      style={{
        background: '#f8fafc',
        borderRadius: 8,
        padding: 14,
        border: '1px solid var(--border)'
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtPct(today)}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
        전일 {fmtPct(yday)}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 13,
          fontWeight: 700,
          color: diff >= 0 ? 'var(--success)' : 'var(--danger)'
        }}
      >
        {diff >= 0 ? '▲' : '▼'} {(diff >= 0 ? '+' : '') + diff.toFixed(1)}%p
      </div>
    </div>
  );
}
