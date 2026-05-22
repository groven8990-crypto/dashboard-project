import React from 'react';
import { fmtKRW, fmtPct } from '../utils/format.js';
import { groupByBusiness, groupByChannel } from '../utils/analytics.js';

export default function BusinessCompare({ rows }) {
  const byBusiness = groupByBusiness(rows);
  const byChannel = groupByChannel(rows);

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">사업자별 실적</div>
            <div className="card-subtitle">매출·매입·순마진 비교</div>
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
                <td><strong>{b.business}</strong></td>
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
              <td className="num">
                {fmtKRW(byBusiness.reduce((s, b) => s + b.revenue, 0))}
              </td>
              <td className="num">{fmtKRW(byBusiness.reduce((s, b) => s + b.cost, 0))}</td>
              <td className="num">{fmtKRW(byBusiness.reduce((s, b) => s + b.margin, 0))}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">채널별 실적</div>
            <div className="card-subtitle">판매 채널/플랫폼별 분석</div>
          </div>
        </div>
        {byChannel.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <div className="muted">채널 컬럼이 데이터에 없습니다.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>채널</th>
                <th>매출</th>
                <th>순마진</th>
                <th>마진율</th>
              </tr>
            </thead>
            <tbody>
              {byChannel.map((c) => (
                <tr key={c.channel}>
                  <td>{c.channel}</td>
                  <td className="num">{fmtKRW(c.revenue)}</td>
                  <td className={`num ${c.margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(c.margin)}</td>
                  <td>{fmtPct(c.marginRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
