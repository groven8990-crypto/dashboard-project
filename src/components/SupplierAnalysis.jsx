import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList
} from 'recharts';
import { fmtKRW, fmtKRWShort, fmtNum, fmtPct } from '../utils/format.js';
import { groupBySupplier } from '../utils/analytics.js';

const COLORS = ['#0ea5e9', '#7c3aed', '#16a34a', '#f59e0b', '#dc2626', '#2563eb', '#ec4899', '#84cc16'];

export default function SupplierAnalysis({ rows }) {
  const bySupplier = useMemo(() => groupBySupplier(rows), [rows]);

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🏭 매입처별 매입 규모</div>
            <div className="card-subtitle">총 {bySupplier.length}개 매입처</div>
          </div>
        </div>
        <div style={{ width: '100%', height: Math.max(280, bySupplier.length * 36) }}>
          <ResponsiveContainer>
            <BarChart
              data={bySupplier}
              layout="vertical"
              margin={{ top: 10, right: 90, bottom: 4, left: 70 }}
            >
              <CartesianGrid stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtKRWShort} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                dataKey="supplier"
                type="category"
                tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }}
                width={90}
              />
              <Tooltip formatter={(v) => fmtKRW(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="cost" name="매입금액" radius={[0, 6, 6, 0]}>
                {bySupplier.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
                <LabelList dataKey="cost" position="right" formatter={fmtKRWShort} style={{ fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>매입처</th>
              <th>주문건수</th>
              <th>매입금액</th>
              <th>배송비</th>
              <th>매출</th>
              <th>순마진</th>
              <th>마진율</th>
            </tr>
          </thead>
          <tbody>
            {bySupplier.map((s, i) => (
              <tr key={s.supplier}>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: COLORS[i % COLORS.length],
                      marginRight: 6
                    }}
                  />
                  <strong>{s.supplier}</strong>
                </td>
                <td className="num">{fmtNum(s.orderCount)}</td>
                <td className="num">{fmtKRW(s.cost)}</td>
                <td className="num">{fmtKRW(s.shipping)}</td>
                <td className="num">{fmtKRW(s.revenue)}</td>
                <td className={`num ${s.margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(s.margin)}</td>
                <td>{fmtPct(s.marginRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
