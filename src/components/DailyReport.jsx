import React, { useMemo, useState } from 'react';
import { fmtKRW, fmtPct, fmtDelta } from '../utils/format.js';
import { aggregate, groupByBusiness, groupByChannel } from '../utils/analytics.js';
import { todayISO, addDays, fmtKDate, parseDate } from '../utils/dateUtils.js';

export default function DailyReport({ rows, dataRange }) {
  const defaultDate = dataRange.max || todayISO();
  const [date, setDate] = useState(defaultDate);

  const todayRows = useMemo(() => rows.filter((r) => r.date === date), [rows, date]);
  const yesterdayRows = useMemo(() => {
    const y = addDays(date, -1);
    return rows.filter((r) => r.date === y);
  }, [rows, date]);

  const lastWeekRows = useMemo(() => {
    const w = addDays(date, -7);
    return rows.filter((r) => r.date === w);
  }, [rows, date]);

  // MTD up to selected date
  const mtdRows = useMemo(() => {
    const d = parseDate(date);
    if (!d) return [];
    const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    return rows.filter((r) => r.date >= monthStart && r.date <= date);
  }, [rows, date]);

  const today = aggregate(todayRows);
  const yesterday = aggregate(yesterdayRows);
  const lastWeek = aggregate(lastWeekRows);
  const mtd = aggregate(mtdRows);

  const byBusiness = groupByBusiness(todayRows);
  const byChannel = groupByChannel(todayRows);

  const dRev = fmtDelta(today.revenue, yesterday.revenue);
  const dRevW = fmtDelta(today.revenue, lastWeek.revenue);
  const dMarg = fmtDelta(today.margin, yesterday.margin);

  const reportText = useMemo(() => {
    const lines = [];
    lines.push(`📊 일일 매출 보고 (${fmtKDate(parseDate(date))})`);
    lines.push('');
    lines.push(`■ 매출 ${fmtKRW(today.revenue)}` + (dRev ? ` (전일比 ${dRev.label})` : ''));
    lines.push(`■ 매입 ${fmtKRW(today.cost)}`);
    lines.push(`■ 순마진 ${fmtKRW(today.margin)} (${fmtPct(today.marginRate)})` + (dMarg ? ` (전일比 ${dMarg.label})` : ''));
    lines.push('');
    if (byBusiness.length) {
      lines.push('▷ 사업자별');
      for (const b of byBusiness) {
        lines.push(`  · ${b.business}: 매출 ${fmtKRW(b.revenue)} / 마진 ${fmtKRW(b.margin)} (${fmtPct(b.marginRate)})`);
      }
    }
    lines.push('');
    lines.push(`▷ 월누계 ${fmtKRW(mtd.revenue)} / 순마진 ${fmtKRW(mtd.margin)} (${fmtPct(mtd.marginRate)})`);
    return lines.join('\n');
  }, [date, today, yesterday, mtd, byBusiness, dRev, dMarg]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    alert('보고서가 클립보드에 복사되었습니다.');
  };

  return (
    <div>
      <div className="toolbar no-print">
        <div className="filter-group">
          <label>보고일자</label>
          <input
            type="date"
            className="input"
            value={date}
            min={dataRange.min || undefined}
            max={dataRange.max || undefined}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="btn sm" onClick={() => setDate(addDays(date, -1))}>◀ 전일</button>
          <button className="btn sm" onClick={() => setDate(addDays(date, 1))}>익일 ▶</button>
        </div>
        <div className="filter-group">
          <button className="btn" onClick={copyReport}>📋 텍스트 복사</button>
          <button className="btn primary" onClick={() => window.print()}>🖨️ 인쇄</button>
        </div>
      </div>

      <div className="report-card">
        <div className="report-header">
          <h2>일일 매출 현황 보고</h2>
          <div className="date">{fmtKDate(parseDate(date))}</div>
        </div>

        <div className="report-section">
          <div className="report-section-title">1. 당일 핵심 지표</div>
          <table className="table">
            <thead>
              <tr>
                <th>항목</th>
                <th>당일</th>
                <th>전일</th>
                <th>전일 대비</th>
                <th>전주 동요일</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>매출액</td>
                <td className="num"><strong>{fmtKRW(today.revenue)}</strong></td>
                <td className="num">{fmtKRW(yesterday.revenue)}</td>
                <td>
                  {dRev && (
                    <span className={dRev.value >= 0 ? 'num pos' : 'num neg'}>
                      {dRev.label}
                    </span>
                  )}
                </td>
                <td>
                  {dRevW && (
                    <span className={dRevW.value >= 0 ? 'num pos' : 'num neg'}>
                      {dRevW.label}
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td>매입원가</td>
                <td className="num">{fmtKRW(today.cost)}</td>
                <td className="num">{fmtKRW(yesterday.cost)}</td>
                <td colSpan={2}></td>
              </tr>
              <tr>
                <td>순마진액</td>
                <td className="num"><strong>{fmtKRW(today.margin)}</strong></td>
                <td className="num">{fmtKRW(yesterday.margin)}</td>
                <td>
                  {dMarg && (
                    <span className={dMarg.value >= 0 ? 'num pos' : 'num neg'}>
                      {dMarg.label}
                    </span>
                  )}
                </td>
                <td></td>
              </tr>
              <tr>
                <td>순마진율</td>
                <td><strong>{fmtPct(today.marginRate)}</strong></td>
                <td>{fmtPct(yesterday.marginRate)}</td>
                <td colSpan={2}></td>
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
          </div>
        )}

        <div className="report-section">
          <div className="report-section-title">4. 비용 상세</div>
          <table className="table">
            <tbody>
              <tr><td>인건비</td><td className="num">{fmtKRW(today.labor)}</td></tr>
              <tr><td>광고비</td><td className="num">{fmtKRW(today.ad)}</td></tr>
              <tr><td>판매수수료</td><td className="num">{fmtKRW(today.fee)}</td></tr>
              <tr><td>부가세</td><td className="num">{fmtKRW(today.vat)}</td></tr>
            </tbody>
            <tfoot>
              <tr>
                <td>판관비 소계</td>
                <td className="num">{fmtKRW(today.labor + today.ad + today.fee + today.vat)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="report-section">
          <div className="report-section-title">5. 월 누계 (MTD)</div>
          <table className="table">
            <tbody>
              <tr><td>월 누계 매출</td><td className="num"><strong>{fmtKRW(mtd.revenue)}</strong></td></tr>
              <tr><td>월 누계 매입</td><td className="num">{fmtKRW(mtd.cost)}</td></tr>
              <tr><td>월 누계 순마진</td><td className="num"><strong>{fmtKRW(mtd.margin)}</strong></td></tr>
              <tr><td>월 누계 마진율</td><td><strong>{fmtPct(mtd.marginRate)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
