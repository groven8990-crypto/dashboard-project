import React, { useMemo, useState } from 'react';
import { fmtKRW, fmtPct, fmtDelta } from '../utils/format.js';
import {
  aggregate,
  groupByBusiness,
  groupByPlatform,
  groupByProductSpec,
  groupByPeriod
} from '../utils/analytics.js';
import { fmtKDateShort } from '../utils/dateUtils.js';

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${y}년 ${parseInt(m, 10)}월`;
}

export default function MonthlyReport({ rows, dataRange }) {
  const maxMonth = (dataRange.max || '').slice(0, 7);
  const minMonth = (dataRange.min || '').slice(0, 7);
  const [month, setMonth] = useState(maxMonth || new Date().toISOString().slice(0, 7));

  const inMonth = (ym) => rows.filter((r) => r.date.slice(0, 7) === ym);

  const curRows = useMemo(() => inMonth(month), [rows, month]);
  const prevRows = useMemo(() => inMonth(shiftMonth(month, -1)), [rows, month]);
  const lastYearRows = useMemo(() => inMonth(shiftMonth(month, -12)), [rows, month]);

  const cur = aggregate(curRows);
  const prev = aggregate(prevRows);
  const lastYear = aggregate(lastYearRows);

  const byBusiness = groupByBusiness(curRows);
  const byChannel = groupByPlatform(curRows);
  const byProduct = useMemo(() => groupByProductSpec(curRows).slice(0, 10), [curRows]);
  const dailyTrend = useMemo(() => groupByPeriod(curRows, 'day'), [curRows]);

  const dRev = fmtDelta(cur.revenue, prev.revenue);
  const dRevY = fmtDelta(cur.revenue, lastYear.revenue);
  const dMarg = fmtDelta(cur.margin, prev.margin);

  const reportText = useMemo(() => {
    const lines = [];
    lines.push(`📊 월간 매출 보고 (${monthLabel(month)})`);
    lines.push('');
    lines.push(`■ 매출 ${fmtKRW(cur.revenue)}` + (dRev ? ` (전월比 ${dRev.label})` : ''));
    lines.push(`■ 매입 ${fmtKRW(cur.cost)}`);
    lines.push(`■ 순마진 ${fmtKRW(cur.margin)} (${fmtPct(cur.marginRate)})` + (dMarg ? ` (전월比 ${dMarg.label})` : ''));
    lines.push(`■ 주문건수 ${cur.orderCount.toLocaleString()}건`);
    lines.push('');
    if (byBusiness.length) {
      lines.push('▷ 사업자별');
      for (const b of byBusiness) {
        lines.push(`  · ${b.business}: 매출 ${fmtKRW(b.revenue)} / 마진 ${fmtKRW(b.margin)} (${fmtPct(b.marginRate)})`);
      }
      lines.push('');
    }
    if (byChannel.length) {
      lines.push('▷ 채널별');
      for (const c of byChannel) {
        lines.push(`  · ${c.platform}: 매출 ${fmtKRW(c.revenue)} / 마진 ${fmtKRW(c.margin)}`);
      }
    }
    return lines.join('\n');
  }, [month, cur, byBusiness, byChannel, dRev, dMarg]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    alert('월간 보고서가 클립보드에 복사되었습니다.');
  };

  const costSubtotal = cur.labor + cur.ad + cur.fee + cur.vat;

  return (
    <div>
      <div className="toolbar no-print">
        <div className="filter-group">
          <label>보고월</label>
          <input
            type="month"
            className="input"
            value={month}
            min={minMonth || undefined}
            max={maxMonth || undefined}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button className="btn sm" onClick={() => setMonth(shiftMonth(month, -1))}>◀ 전월</button>
          <button className="btn sm" onClick={() => setMonth(shiftMonth(month, 1))}>익월 ▶</button>
        </div>
        <div className="filter-group">
          <button className="btn" onClick={copyReport}>📋 텍스트 복사</button>
          <button className="btn primary" onClick={() => window.print()}>🖨️ 인쇄</button>
        </div>
      </div>

      <div className="report-card">
        <div className="report-header">
          <h2>월간 매출 현황 보고</h2>
          <div className="date">{monthLabel(month)}</div>
        </div>

        <div className="report-section">
          <div className="report-section-title">1. 당월 핵심 지표</div>
          <table className="table">
            <thead>
              <tr>
                <th>항목</th>
                <th>당월</th>
                <th>전월</th>
                <th>전월 대비</th>
                <th>전년 동월</th>
                <th>전년 대비</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>매출액</td>
                <td className="num"><strong>{fmtKRW(cur.revenue)}</strong></td>
                <td className="num">{fmtKRW(prev.revenue)}</td>
                <td>{dRev && <span className={dRev.value >= 0 ? 'num pos' : 'num neg'}>{dRev.label}</span>}</td>
                <td className="num">{fmtKRW(lastYear.revenue)}</td>
                <td>{dRevY && <span className={dRevY.value >= 0 ? 'num pos' : 'num neg'}>{dRevY.label}</span>}</td>
              </tr>
              <tr>
                <td>매입원가</td>
                <td className="num">{fmtKRW(cur.cost)}</td>
                <td className="num">{fmtKRW(prev.cost)}</td>
                <td colSpan={3}></td>
              </tr>
              <tr>
                <td>순마진액</td>
                <td className="num"><strong>{fmtKRW(cur.margin)}</strong></td>
                <td className="num">{fmtKRW(prev.margin)}</td>
                <td>{dMarg && <span className={dMarg.value >= 0 ? 'num pos' : 'num neg'}>{dMarg.label}</span>}</td>
                <td colSpan={2}></td>
              </tr>
              <tr>
                <td>순마진율</td>
                <td><strong>{fmtPct(cur.marginRate)}</strong></td>
                <td>{fmtPct(prev.marginRate)}</td>
                <td colSpan={3}></td>
              </tr>
              <tr>
                <td>주문건수</td>
                <td className="num"><strong>{cur.orderCount.toLocaleString()}건</strong></td>
                <td className="num">{prev.orderCount.toLocaleString()}건</td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {byBusiness.length > 0 && (
          <div className="report-section">
            <div className="report-section-title">2. 사업자별 실적</div>
            <table className="table">
              <thead>
                <tr>
                  <th>사업자</th>
                  <th>매출</th>
                  <th>매입</th>
                  <th>순마진</th>
                  <th>마진율</th>
                  <th>건수</th>
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
                    <td className="num">{b.orderCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {byChannel.length > 0 && (
          <div className="report-section">
            <div className="report-section-title">3. 채널별 실적</div>
            <table className="table">
              <thead>
                <tr>
                  <th>채널</th>
                  <th>매출</th>
                  <th>순마진</th>
                  <th>마진율</th>
                  <th>건수</th>
                </tr>
              </thead>
              <tbody>
                {byChannel.map((c) => (
                  <tr key={c.platform}>
                    <td>{c.platform}</td>
                    <td className="num">{fmtKRW(c.revenue)}</td>
                    <td className={`num ${c.margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(c.margin)}</td>
                    <td>{fmtPct(c.marginRate)}</td>
                    <td className="num">{c.orderCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {byProduct.length > 0 && (
          <div className="report-section">
            <div className="report-section-title">4. 제품 TOP 10 (매출순)</div>
            <table className="table">
              <thead>
                <tr>
                  <th>제품</th>
                  <th>규격</th>
                  <th>수량</th>
                  <th>매출</th>
                  <th>순마진</th>
                  <th>마진율</th>
                </tr>
              </thead>
              <tbody>
                {byProduct.map((p) => (
                  <tr key={`${p.product}|${p.spec}`}>
                    <td>{p.product}</td>
                    <td className="muted text-xs">{p.spec}</td>
                    <td className="num">{p.quantity.toLocaleString()}</td>
                    <td className="num">{fmtKRW(p.revenue)}</td>
                    <td className={`num ${p.margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(p.margin)}</td>
                    <td>{fmtPct(p.marginRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="report-section">
          <div className="report-section-title">5. 비용 상세</div>
          <table className="table">
            <tbody>
              <tr><td>배송비</td><td className="num">{fmtKRW(cur.shipping)}</td></tr>
              <tr><td>인건비</td><td className="num">{fmtKRW(cur.labor)}</td></tr>
              <tr><td>광고비</td><td className="num">{fmtKRW(cur.ad)}</td></tr>
              <tr><td>판매수수료</td><td className="num">{fmtKRW(cur.fee)}</td></tr>
              <tr><td>부가세</td><td className="num">{fmtKRW(cur.vat)}</td></tr>
            </tbody>
            <tfoot>
              <tr>
                <td>판관비 소계</td>
                <td className="num">{fmtKRW(costSubtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {dailyTrend.length > 0 && (
          <div className="report-section">
            <div className="report-section-title">6. 일자별 추이</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>일자</th>
                    <th>매출</th>
                    <th>매입</th>
                    <th>순마진</th>
                    <th>마진율</th>
                    <th>건수</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyTrend.map((d) => (
                    <tr key={d.period}>
                      <td>{fmtKDateShort(d.period)}</td>
                      <td className="num">{fmtKRW(d.revenue)}</td>
                      <td className="num">{fmtKRW(d.cost)}</td>
                      <td className={`num ${d.margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(d.margin)}</td>
                      <td>{fmtPct(d.marginRate)}</td>
                      <td className="num">{d.orderCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>합계</td>
                    <td className="num">{fmtKRW(cur.revenue)}</td>
                    <td className="num">{fmtKRW(cur.cost)}</td>
                    <td className={`num ${cur.margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(cur.margin)}</td>
                    <td>{fmtPct(cur.marginRate)}</td>
                    <td className="num">{cur.orderCount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {curRows.length === 0 && (
          <div className="empty-state" style={{ padding: 24 }}>
            <p>{monthLabel(month)}에 해당하는 데이터가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
