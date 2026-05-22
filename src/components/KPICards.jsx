import React from 'react';
import { fmtKRW, fmtPct, fmtNum, fmtDelta } from '../utils/format.js';

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
  const dOrders = previous ? fmtDelta(current.orderCount, previous.orderCount) : null;

  return (
    <div className="kpi-grid">
      <Card
        label="매출"
        value={fmtKRW(current.revenue)}
        sub={`${fmtNum(current.orderCount)}건 · 객단가 ${fmtKRW(current.avgOrderValue)}`}
        delta={dRevenue}
        accent="blue"
      />
      <Card
        label="매입 + 배송비"
        value={fmtKRW(current.cost + current.shipping)}
        sub={`매입 ${fmtKRW(current.cost)} · 배송 ${fmtKRW(current.shipping)}`}
        accent="orange"
      />
      <Card
        label="순마진액"
        value={fmtKRW(current.margin)}
        sub="매출 − (매입 + 배송 + 인건 + 광고 + 수수료 + 부가세)"
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
        label="주문건수"
        value={fmtNum(current.orderCount)}
        sub={`수량 ${fmtNum(current.quantity)}개`}
        delta={dOrders}
        accent="red"
      />
    </div>
  );
}
