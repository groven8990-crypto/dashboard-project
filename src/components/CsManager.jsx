import React, { useMemo, useState } from 'react';
import { orderKey, CS_STATUSES } from '../utils/csInfo.js';

const PAGE_SIZE = 50;

// 주의가 필요한 CS 상태 (대시보드 강조용)
const ATTENTION = new Set(['신규', '교환', '반품', '취소']);

const STATUS_COLOR = {
  '신규': { bg: '#dbeafe', fg: '#2563eb' },
  '발송준비': { bg: '#fef9c3', fg: '#a16207' },
  '발송완료': { bg: '#e0e7ff', fg: '#4f46e5' },
  '배송중': { bg: '#cffafe', fg: '#0891b2' },
  '배송완료': { bg: '#dcfce7', fg: '#16a34a' },
  '교환': { bg: '#ffedd5', fg: '#c2410c' },
  '반품': { bg: '#fee2e2', fg: '#dc2626' },
  '취소': { bg: '#fee2e2', fg: '#dc2626' },
  '완료': { bg: '#f1f5f9', fg: '#64748b' }
};

export default function CsManager({ rows, csInfo = {}, onCsChange }) {
  const [statusFilter, setStatusFilter] = useState(null); // null=전체, '' = 미지정
  const [query, setQuery] = useState('');
  const [business, setBusiness] = useState('');
  const [page, setPage] = useState(0);

  const businesses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.business).filter(Boolean))).sort(),
    [rows]
  );

  // 각 주문행에 CS 정보를 결합
  const decorated = useMemo(
    () =>
      rows.map((r) => {
        const key = orderKey(r);
        const cs = csInfo[key] || {};
        return {
          r,
          key,
          status: cs.csStatus || '',
          invoice: cs.invoice !== undefined ? cs.invoice : (r.invoice || ''),
          memo: cs.csMemo || ''
        };
      }),
    [rows, csInfo]
  );

  // 상태별 건수
  const counts = useMemo(() => {
    const m = {};
    for (const d of decorated) m[d.status] = (m[d.status] || 0) + 1;
    return m;
  }, [decorated]);

  const attentionCount = useMemo(
    () => decorated.filter((d) => ATTENTION.has(d.status)).length,
    [decorated]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return decorated
      .filter((d) => {
        if (statusFilter !== null && d.status !== statusFilter) return false;
        if (business && d.r.business !== business) return false;
        if (!q) return true;
        return [d.r.recipient, d.r.product, d.r.orderNo, d.r.phone, d.r.address, d.invoice, d.memo]
          .some((v) => String(v || '').toLowerCase().includes(q));
      })
      .sort((a, b) => String(b.r.date).localeCompare(String(a.r.date)));
  }, [decorated, statusFilter, business, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const resetPage = (fn) => (...args) => { setPage(0); fn(...args); };

  const chips = [
    { label: '전체', value: null, count: decorated.length },
    { label: '미지정', value: '', count: counts[''] || 0 },
    ...CS_STATUSES.filter((s) => s).map((s) => ({ label: s, value: s, count: counts[s] || 0 }))
  ];

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🎧 CS 관리</div>
            <div className="card-subtitle">
              송장번호·CS 상태·메모를 한 곳에서 관리합니다. 변경은 자동 저장·동기화됩니다.
            </div>
          </div>
          {attentionCount > 0 && (
            <span className="badge" style={{ background: '#fee2e2', color: '#dc2626' }}>
              ⚠ 처리 필요 {attentionCount.toLocaleString()}건
            </span>
          )}
        </div>

        {/* 상태별 요약 칩 */}
        <div className="filter-group" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {chips.map((c) => {
            const active = statusFilter === c.value;
            const color = c.value ? STATUS_COLOR[c.value] : null;
            return (
              <button
                key={String(c.value)}
                className="btn"
                onClick={resetPage(() => setStatusFilter(c.value))}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: active ? 'var(--primary-soft)' : (color ? color.bg : 'white'),
                  color: active ? 'var(--primary)' : (color ? color.fg : 'var(--text)')
                }}
              >
                {c.label} <strong>{c.count.toLocaleString()}</strong>
              </button>
            );
          })}
        </div>

        {/* 검색·필터 */}
        <div className="filter-group" style={{ gap: 8 }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="수취인 / 제품 / 주문번호 / 연락처 / 주소 / 송장 검색"
            value={query}
            onChange={resetPage((e) => setQuery(e.target.value))}
          />
          <select className="select" value={business} onChange={resetPage((e) => setBusiness(e.target.value))}>
            <option value="">전체 사업자</option>
            {businesses.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-subtitle">
            {filtered.length.toLocaleString()}건
            {filtered.length > PAGE_SIZE && ` · ${safePage + 1} / ${totalPages} 페이지`}
          </div>
          {totalPages > 1 && (
            <div className="filter-group">
              <button className="btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>← 이전</button>
              <button className="btn" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>다음 →</button>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th>주문일</th>
                <th>발주일</th>
                <th>사업자</th>
                <th>판매처</th>
                <th>제품</th>
                <th>수취인</th>
                <th>연락처</th>
                <th>주소</th>
                <th>송장번호</th>
                <th>CS상태</th>
                <th>CS메모</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ r, key, status, invoice, memo }, i) => {
                const color = STATUS_COLOR[status];
                return (
                  <tr key={key || i}>
                    <td>
                      {r.date}
                      {r.orderTime ? <span style={{ color: 'var(--muted)', marginLeft: 4 }}>{r.orderTime}</span> : null}
                    </td>
                    <td>{r.dispatchDate || '—'}</td>
                    <td>{r.business || '—'}</td>
                    <td>{r.platform || '—'}</td>
                    <td style={{ whiteSpace: 'normal' }}>
                      {r.product || '—'}
                      {r.spec ? <span style={{ color: 'var(--muted)' }}> · {r.spec}</span> : null}
                    </td>
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
                        value={invoice}
                        disabled={!onCsChange}
                        onChange={(e) => onCsChange && onCsChange(key, { invoice: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        className="select"
                        style={{
                          fontSize: 12,
                          padding: '2px 6px',
                          background: color ? color.bg : undefined,
                          color: color ? color.fg : undefined,
                          fontWeight: status ? 700 : 400
                        }}
                        value={status}
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
                        style={{ width: 200, fontSize: 12, padding: '2px 6px' }}
                        placeholder="CS 메모"
                        value={memo}
                        disabled={!onCsChange}
                        onChange={(e) => onCsChange && onCsChange(key, { csMemo: e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                    조건에 맞는 주문이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
