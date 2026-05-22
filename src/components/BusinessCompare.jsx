import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList
} from 'recharts';
import { fmtKRW, fmtPct, fmtKRWShort } from '../utils/format.js';
import { groupByBusiness, groupByChannel } from '../utils/analytics.js';

const BIZ_COLORS = {
  그로븐: '#16a34a',
  옐로우브릿지: '#f59e0b'
};
const CHANNEL_COLORS = ['#2563eb', '#dc2626', '#7c3aed', '#0ea5e9', '#f97316', '#84cc16', '#ec4899'];

function getBizColor(name) {
  return BIZ_COLORS[name] || '#64748b';
}

export default function BusinessCompare({ rows }) {
  const byBusiness = groupByBusiness(rows);
  const byChannel = groupByChannel(rows);

  return (
    <>
      {/* 사업자별 차트 + 표 */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🏢 사업자별 매출·마진</div>
              <div className="card-subtitle">매출 vs 순마진 비교 막대</div>
            </div>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={byBusiness} margin={{ top: 20, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="business" tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }} />
                <YAxis tickFormatter={fmtKRWShort} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(v) => fmtKRW(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="매출" fill="#2563eb" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="revenue" position="top" formatter={fmtKRWShort} style={{ fontSize: 11, fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="margin" name="순마진" fill="#16a34a" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="margin" position="top" formatter={fmtKRWShort} style={{ fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">사업자별 실적 명세</div>
              <div className="card-subtitle">매출·매입·순마진·마진율</div>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>사업자</th>
                <th>매출</th>
                <th>매입</th>
                <th>순마진</th>
                <th>마진율</th>
              </tr>
            </thead>
            <tbody>
              {byBusiness.map((b) => (
                <tr key={b.business}>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: getBizColor(b.business),
                        marginRight: 6
                      }}
                    />
                    <strong>{b.business}</strong>
                  </td>
                  <td className="num">{fmtKRW(b.revenue)}</td>
                  <td className="num">{fmtKRW(b.cost)}</td>
                  <td className={`num ${b.margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(b.margin)}</td>
                  <td>{fmtPct(b.marginRate)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>합계</td>
                <td className="num">{fmtKRW(byBusiness.reduce((s, b) => s + b.revenue, 0))}</td>
                <td className="num">{fmtKRW(byBusiness.reduce((s, b) => s + b.cost, 0))}</td>
                <td className="num">{fmtKRW(byBusiness.reduce((s, b) => s + b.margin, 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 채널별 가로 막대 차트 */}
      {byChannel.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🛒 채널별 매출 순위</div>
              <div className="card-subtitle">스마트스토어·쿠팡·11번가·지마켓·옥션·톡딜 비교</div>
            </div>
          </div>
          <div style={{ width: '100%', height: Math.max(220, byChannel.length * 50) }}>
            <ResponsiveContainer>
              <BarChart
                data={byChannel}
                layout="vertical"
                margin={{ top: 10, right: 80, bottom: 4, left: 60 }}
              >
                <CartesianGrid stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtKRWShort} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  dataKey="channel"
                  type="category"
                  tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }}
                  width={80}
                />
                <Tooltip formatter={(v) => fmtKRW(v)} />
                <Bar dataKey="revenue" name="매출" radius={[0, 6, 6, 0]}>
                  {byChannel.map((c, i) => (
                    <Cell key={c.channel} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                  ))}
                  <LabelList dataKey="revenue" position="right" formatter={fmtKRWShort} style={{ fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 채널 상세표 */}
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>채널</th>
                <th>매출</th>
                <th>매출비중</th>
                <th>순마진</th>
                <th>마진율</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const total = byChannel.reduce((s, c) => s + c.revenue, 0);
                return byChannel.map((c, i) => (
                  <tr key={c.channel}>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
                          marginRight: 6
                        }}
                      />
                      {c.channel}
                    </td>
                    <td className="num">{fmtKRW(c.revenue)}</td>
                    <td>{total ? ((c.revenue / total) * 100).toFixed(1) : 0}%</td>
                    <td className={`num ${c.margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(c.margin)}</td>
                    <td>{fmtPct(c.marginRate)}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
