import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { fmtKRW, fmtPct } from '../utils/format.js';

const EXPENSE_COLORS = {
  매입: '#f97316',
  배송비: '#fb923c',
  인건비: '#dc2626',
  광고비: '#a855f7',
  판매수수료: '#0ea5e9',
  부가세: '#facc15'
};

export default function MarginAnalysis({ agg }) {
  const expenseData = [
    { name: '매입', value: agg.cost },
    { name: '배송비', value: agg.shipping },
    { name: '인건비', value: agg.labor },
    { name: '광고비', value: agg.ad },
    { name: '판매수수료', value: agg.fee },
    { name: '부가세', value: agg.vat }
  ].filter((d) => d.value > 0);

  const totalExpense = expenseData.reduce((s, d) => s + d.value, 0);
  const rev = agg.revenue || 1;
  const pct = (v) => fmtPct((v / rev) * 100);

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">비용 구성</div>
            <div className="card-subtitle">
              매입 · 배송비 · 인건비 · 광고비 · 판매수수료 · 부가세 분해
            </div>
          </div>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={expenseData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                label={(d) =>
                  totalExpense ? `${((d.value / totalExpense) * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
              >
                {expenseData.map((d) => (
                  <Cell key={d.name} fill={EXPENSE_COLORS[d.name]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmtKRW(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">마진 구조 명세</div>
            <div className="card-subtitle">최종 순마진액과 순마진율</div>
          </div>
        </div>
        <table className="table">
          <tbody>
            <tr>
              <td>매출액</td>
              <td className="num">{fmtKRW(agg.revenue)}</td>
              <td className="muted">100.0%</td>
            </tr>
            <tr>
              <td>(-) 매입원가</td>
              <td className="num neg">{fmtKRW(agg.cost)}</td>
              <td className="muted">{pct(agg.cost)}</td>
            </tr>
            <tr>
              <td>(-) 배송비</td>
              <td className="num neg">{fmtKRW(agg.shipping)}</td>
              <td className="muted">{pct(agg.shipping)}</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: 18, color: 'var(--text-muted)' }}>매출총이익</td>
              <td className="num">{fmtKRW(agg.grossProfit)}</td>
              <td className="muted">{fmtPct(agg.grossRate)}</td>
            </tr>
            <tr>
              <td>(-) 인건비</td>
              <td className="num neg">{fmtKRW(agg.labor)}</td>
              <td className="muted">{pct(agg.labor)}</td>
            </tr>
            <tr>
              <td>(-) 광고비</td>
              <td className="num neg">{fmtKRW(agg.ad)}</td>
              <td className="muted">{pct(agg.ad)}</td>
            </tr>
            <tr>
              <td>(-) 판매수수료</td>
              <td className="num neg">{fmtKRW(agg.fee)}</td>
              <td className="muted">{pct(agg.fee)}</td>
            </tr>
            <tr>
              <td>(-) 부가세</td>
              <td className="num neg">{fmtKRW(agg.vat)}</td>
              <td className="muted">{pct(agg.vat)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>순마진액</td>
              <td className={`num ${agg.margin >= 0 ? 'pos' : 'neg'}`}>
                {fmtKRW(agg.margin)}
              </td>
              <td>{fmtPct(agg.marginRate)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
