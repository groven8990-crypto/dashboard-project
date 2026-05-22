import React from 'react';
import { fmtKRW, fmtPct, fmtDelta } from '../utils/format.js';

function Card({ label, value, sub, delta, accent }) {
  return (
    <div className={`kpi-card accent-${accent}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
      {delta && (
        <div className={`delta ${delta.value >= 0 ? 'up' : 'down'}`}>
          전기 대비 {delta.label}
        </div>
      )}
    </div>
  );
}

export default function KPICards({ current, previous }) {
  const dRevenue = previous ? fmtDelta(current.revenue, previous.revenue) : null;
  const dMargin = previous ? fmtDelta(current.margin, previous.margin) : null;
  const dCost = previous ? fmtDelta(current.cost, previous.cost) : null;

  return (
    <div className="kpi-grid">
      <Card
        label="매출"
        value={fmtKRW(current.revenue)}
        delta={dRevenue}
        accent="blue"
      />
      <Card
        label="매입"
        value={fmtKRW(current.cost)}
        delta={dCost}
        accent="orange"
      />
      <Card
        label="순마진액"
        value={fmtKRW(current.margin)}
        sub="매출 - 매입 - 인건비 - 광고비 - 수수료 - 부가세"
        delta={dMargin}
        accent="green"
      />
      <Card
        label="순마진율"
        value={fmtPct(current.marginRate)}
        sub={`매출총이익률 ${fmtPct(current.grossRate)}`}
        accent="purple"
      />
      <Card
        label="총비용"
        value={fmtKRW(
          current.cost + current.labor + current.ad + current.fee + current.vat
        )}
        sub={`인건비 ${fmtKRW(current.labor)} · 광고 ${fmtKRW(current.ad)}`}
        accent="red"
      />
    </div>
  );
}
