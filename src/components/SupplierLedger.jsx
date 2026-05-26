import React, { useMemo, useState } from 'react';
import { fmtKRW, fmtNum } from '../utils/format.js';
import { orderKey, CS_STATUSES } from '../utils/csInfo.js';
import { lineCost } from '../utils/analytics.js';

function fmt(n) {
  return Math.round(n || 0).toLocaleString('ko-KR');
}

export default function SupplierLedger({ rows, csInfo = {}, onCsChange }) {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortAsc, setSortAsc] = useState(false);

  const suppliers = useMemo(() => {
    const set = new Set();
    for (const r of rows) if (r.supplier) set.add(r.supplier);
    return Array.from(set).sort();
  }, [rows]);

  // Summary by supplier (across full filtered rows)
  const summaryBySupplier = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const s = r.supplier || '(미지정)';
      if (!map.has(s)) {
        map.set(s, { supplier: s, orders: 0, revenue: 0, cost: 0, shipping: 0, fee: 0 });
      }
      const g = map.get(s);
      g.orders++;
      g.revenue += r.revenue || 0;
      g.cost += lineCost(r);
      g.shipping += r.shipping || 0;
      g.fee += r.fee || 0;
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [rows]);

  // Detail rows for selected supplier
  const detailRows = useMemo(() => {
    const base = selectedSupplier
      ? rows.filter((r) => r.supplier === selectedSupplier)
      : rows;

    const field = sortField;
    return [...base].sort((a, b) => {
      const av = a[field] ?? '';
      const bv = b[field] ?? '';
      if (typeof av === 'number') return sortAsc ? av - bv : bv - av;
      return sortAsc
        ? String(av).localeCompare(String(bv), 'ko')
        : String(bv).localeCompare(String(av), 'ko');
    });
  }, [rows, selectedSupplier, sortField, sortAsc]);

  const detailTotals = useMemo(() => {
    return detailRows.reduce(
      (s, r) => ({
        orders: s.orders + 1,
        revenue: s.revenue + (r.revenue || 0),
        cost: s.cost + lineCost(r),
        shipping: s.shipping + (r.shipping || 0),
        fee: s.fee + (r.fee || 0)
      }),
      { orders: 0, revenue: 0, cost: 0, shipping: 0, fee: 0 }
    );
  }, [detailRows]);

  const toggleSort = (field) => {
    if (sortField === field) setSortAsc((v) => !v);
    else { setSortField(field); setSortAsc(false); }
  };
  const sortIcon = (field) => sortField === field ? (sortAsc ? ' ▲' : ' ▼') : '';

  return (
    <>
      {/* 거래처 요약 카드 */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🧾 거래처별 정산 요약</div>
            <div className="card-subtitle">
              총 {summaryBySupplier.length}개 거래처 · 매입 배송비는 거래처 청구액 대조용
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>거래처</th>
                <th>주문건수</th>
                <th>주문금액(합)</th>
                <th>매입가(합)</th>
                <th>매입 배송비</th>
                <th>수수료(합)</th>
                <th>추정 마진</th>
              </tr>
            </thead>
            <tbody>
              {summaryBySupplier.map((s) => {
                const margin = s.revenue - s.cost - s.shipping - s.fee;
                return (
                  <tr
                    key={s.supplier}
                    style={{
                      cursor: 'pointer',
                      background: selectedSupplier === s.supplier ? 'var(--primary-soft)' : undefined
                    }}
                    onClick={() =>
                      setSelectedSupplier((prev) => (prev === s.supplier ? '' : s.supplier))
                    }
                  >
                    <td>
                      <strong style={{ color: selectedSupplier === s.supplier ? 'var(--primary)' : undefined }}>
                        {s.supplier}
                      </strong>
                    </td>
                    <td className="num">{fmtNum(s.orders)}</td>
                    <td className="num">{fmt(s.revenue)}</td>
                    <td className="num">{fmt(s.cost)}</td>
                    <td className="num" style={{ color: s.shipping > 0 ? 'var(--warning)' : undefined }}>
                      {fmt(s.shipping)}
                    </td>
                    <td className="num">{fmt(s.fee)}</td>
                    <td className={`num ${margin >= 0 ? 'pos' : 'neg'}`}>{fmt(margin)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {summaryBySupplier.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, padding: '0 4px' }}>
            * 행을 클릭하면 아래에서 해당 거래처의 주문 세부내역을 확인할 수 있습니다.
          </div>
        )}
      </div>

      {/* 세부내역 테이블 */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              📋 주문 세부내역
              {selectedSupplier && (
                <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--primary)' }}>
                  — {selectedSupplier}
                </span>
              )}
            </div>
            <div className="card-subtitle">
              {detailRows.length.toLocaleString()}건 · 주문자 인적사항·송장번호·CS를 한 줄에서 관리하세요
            </div>
          </div>
          <div className="filter-group">
            <select
              className="select"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">전체 거래처</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {selectedSupplier && (
              <button className="btn" onClick={() => setSelectedSupplier('')}>
                전체 보기
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('date')}>주문일시{sortIcon('date')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('dispatchDate')}>발주일자{sortIcon('dispatchDate')}</th>
                <th>거래처</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('product')}>제품명{sortIcon('product')}</th>
                <th>규격</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('quantity')}>수량{sortIcon('quantity')}</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('revenue')}>주문금액{sortIcon('revenue')}</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('cost')}>매입가{sortIcon('cost')}</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('shipping')}>매입 배송비{sortIcon('shipping')}</th>
                <th style={{ textAlign: 'right' }}>수수료</th>
                <th>수취인</th>
                <th>연락처</th>
                <th>주소</th>
                <th>송장번호</th>
                <th>CS상태</th>
                <th>CS메모</th>
                <th>주문번호</th>
                <th>판매처</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((r, i) => {
                const key = orderKey(r);
                const cs = csInfo[key] || {};
                const invoiceVal = cs.invoice !== undefined ? cs.invoice : (r.invoice || '');
                return (
                  <tr key={key || i}>
                    <td>
                      {r.date}
                      {r.orderTime ? <span style={{ color: 'var(--muted)', marginLeft: 4 }}>{r.orderTime}</span> : null}
                    </td>
                    <td>{r.dispatchDate || '—'}</td>
                    <td>{r.supplier || '—'}</td>
                    <td style={{ whiteSpace: 'normal' }}>{r.product || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{r.spec || ''}</td>
                    <td className="num">{r.quantity || 1}</td>
                    <td className="num">{fmt(r.revenue)}</td>
                    <td className="num" style={{ color: r.cost > 0 ? undefined : 'var(--muted)' }} title={r.cost > 0 ? `단가 ${fmt(r.cost)} × ${r.quantity || 1}` : ''}>
                      {r.cost > 0 ? fmt(lineCost(r)) : '—'}
                    </td>
                    <td className="num" style={{ color: (r.shipping || 0) > 0 ? 'var(--warning)' : 'var(--muted)' }}>
                      {(r.shipping || 0) > 0 ? fmt(r.shipping) : '—'}
                    </td>
                    <td className="num">{r.fee > 0 ? fmt(r.fee) : '—'}</td>
                    <td>{r.recipient || '—'}</td>
                    <td>{r.phone || '—'}</td>
                    <td
                      style={{ whiteSpace: 'normal', maxWidth: 220, color: 'var(--muted)' }}
                      title={r.address || ''}
                    >
                      {r.address || '—'}
                    </td>
                    <td>
                      <input
                        className="input"
                        style={{ width: 130, fontSize: 12, padding: '2px 6px' }}
                        placeholder="송장번호"
                        value={invoiceVal}
                        disabled={!onCsChange}
                        onChange={(e) => onCsChange && onCsChange(key, { invoice: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        className="select"
                        style={{ fontSize: 12, padding: '2px 6px' }}
                        value={cs.csStatus || ''}
                        disabled={!onCsChange}
                        onChange={(e) => onCsChange && onCsChange(key, { csStatus: e.target.value })}
                      >
                        {CS_STATUSES.map((s) => (
                          <option key={s} value={s}>{s || '—'}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="input"
                        style={{ width: 160, fontSize: 12, padding: '2px 6px' }}
                        placeholder="CS 메모"
                        value={cs.csMemo || ''}
                        disabled={!onCsChange}
                        onChange={(e) => onCsChange && onCsChange(key, { csMemo: e.target.value })}
                      />
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{r.orderNo || ''}</td>
                    <td>{r.platform || ''}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}><strong>합계 ({detailTotals.orders.toLocaleString()}건)</strong></td>
                <td className="num"><strong>{fmt(detailRows.reduce((s, r) => s + (r.quantity || 1), 0))}</strong></td>
                <td className="num"><strong>{fmt(detailTotals.revenue)}</strong></td>
                <td className="num"><strong>{fmt(detailTotals.cost)}</strong></td>
                <td className="num" style={{ color: detailTotals.shipping > 0 ? 'var(--warning)' : undefined }}>
                  <strong>{fmt(detailTotals.shipping)}</strong>
                </td>
                <td className="num"><strong>{fmt(detailTotals.fee)}</strong></td>
                <td colSpan={8} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
