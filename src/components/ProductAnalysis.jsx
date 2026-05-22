import React, { useMemo, useState } from 'react';
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
import { groupByProduct, groupByProductSpec } from '../utils/analytics.js';

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0ea5e9', '#ec4899', '#84cc16'];

export default function ProductAnalysis({ rows }) {
  const [topN, setTopN] = useState(15);
  const byProduct = useMemo(() => groupByProduct(rows), [rows]);
  const byProductSpec = useMemo(() => groupByProductSpec(rows), [rows]);

  const topProducts = byProduct.slice(0, topN);

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🏆 매출 TOP {topN} 제품</div>
            <div className="card-subtitle">총 {byProduct.length}개 제품 중 상위</div>
          </div>
          <div className="filter-group">
            <label>상위</label>
            <select className="select" value={topN} onChange={(e) => setTopN(+e.target.value)}>
              <option value={10}>10개</option>
              <option value={15}>15개</option>
              <option value={20}>20개</option>
              <option value={30}>30개</option>
            </select>
          </div>
        </div>
        <div style={{ width: '100%', height: Math.max(280, topN * 32) }}>
          <ResponsiveContainer>
            <BarChart
              data={topProducts}
              layout="vertical"
              margin={{ top: 10, right: 90, bottom: 4, left: 70 }}
            >
              <CartesianGrid stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtKRWShort} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                dataKey="product"
                type="category"
                tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }}
                width={90}
              />
              <Tooltip
                formatter={(v) => fmtKRW(v)}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="revenue" name="매출" radius={[0, 6, 6, 0]}>
                {topProducts.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
                <LabelList
                  dataKey="revenue"
                  position="right"
                  formatter={fmtKRWShort}
                  style={{ fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>순위</th>
              <th>제품명</th>
              <th>주문건수</th>
              <th>매출</th>
              <th>매출비중</th>
              <th>순마진</th>
              <th>마진율</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const total = byProduct.reduce((s, p) => s + p.revenue, 0);
              return topProducts.map((p, i) => (
                <tr key={p.product}>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 22,
                        textAlign: 'center',
                        fontWeight: 700
                      }}
                    >
                      {i + 1}
                    </span>
                  </td>
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
                    <strong>{p.product}</strong>
                  </td>
                  <td className="num">{fmtNum(p.orderCount)}</td>
                  <td className="num">{fmtKRW(p.revenue)}</td>
                  <td>{total ? ((p.revenue / total) * 100).toFixed(1) : 0}%</td>
                  <td className={`num ${p.margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(p.margin)}</td>
                  <td>{fmtPct(p.marginRate)}</td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">📦 제품 + 규격별 상세 (가격 이력)</div>
            <div className="card-subtitle">
              동일 제품의 규격별 매출/마진. 자동 단가 제안에 사용되는 데이터.
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>제품명</th>
                <th>규격</th>
                <th>건수</th>
                <th>매출</th>
                <th>평균 판매가</th>
                <th>평균 매입가</th>
                <th>순마진</th>
                <th>마진율</th>
              </tr>
            </thead>
            <tbody>
              {byProductSpec.slice(0, 50).map((p, i) => (
                <tr key={`${p.product}-${p.spec}-${i}`}>
                  <td><strong>{p.product}</strong></td>
                  <td className="muted">{p.spec || '-'}</td>
                  <td className="num">{fmtNum(p.orderCount)}</td>
                  <td className="num">{fmtKRW(p.revenue)}</td>
                  <td className="num">{fmtKRW(p.orderCount ? p.revenue / p.orderCount : 0)}</td>
                  <td className="num">{fmtKRW(p.orderCount ? p.cost / p.orderCount : 0)}</td>
                  <td className={`num ${p.margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(p.margin)}</td>
                  <td>{fmtPct(p.marginRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {byProductSpec.length > 50 && (
            <div className="muted text-xs" style={{ padding: 10, textAlign: 'center' }}>
              상위 50개만 표시. 전체 {byProductSpec.length}개
            </div>
          )}
        </div>
      </div>
    </>
  );
}
