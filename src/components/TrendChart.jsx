import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { fmtKRWShort, fmtKRW, fmtPct } from '../utils/format.js';
import { periodLabel } from '../utils/dateUtils.js';

const COLORS = {
  revenue: '#2563eb',
  cost: '#f97316',
  margin: '#16a34a',
  marginRate: '#7c3aed'
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        fontSize: 12
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {p.dataKey === 'marginRate' ? fmtPct(p.value) : fmtKRW(p.value)}
        </div>
      ))}
    </div>
  );
}

export default function TrendChart({ data, granularity }) {
  const chartData = data.map((d) => ({
    ...d,
    label: periodLabel(d.period, granularity)
  }));

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">매출·매입·마진 추이</div>
          <div className="card-subtitle">막대: 매출/매입/마진액 · 선: 마진율(%)</div>
        </div>
      </div>
      <div style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis
              yAxisId="left"
              tickFormatter={fmtKRWShort}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => v.toFixed(0) + '%'}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="revenue" name="매출" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="cost" name="매입" fill={COLORS.cost} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="margin" name="순마진" fill={COLORS.margin} radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="marginRate"
              name="마진율"
              stroke={COLORS.marginRate}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
