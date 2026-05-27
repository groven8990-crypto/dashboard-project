import React, { useMemo, useRef, useState } from 'react';
import { fmtKRW } from '../utils/format.js';
import { emptyPriceRow, totalCost, parsePriceTableFromExcel } from '../utils/priceTable.js';

const PAGE_SIZE = 50;

const NUM_FIELDS = ['unitPrice', 'inboundShip', 'salePrice', 'priceNaver', 'priceCoupang', 'priceTokdeal', 'price11st', 'priceAuctionG'];

export default function PriceTableManager({ priceTable = [], onChange, onApplyToOrders }) {
  const fileRef = useRef(null);
  const [query, setQuery] = useState('');
  const [supplier, setSupplier] = useState('');
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState(null);

  const suppliers = useMemo(
    () => Array.from(new Set(priceTable.map((r) => r.supplier).filter(Boolean))).sort(),
    [priceTable]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return priceTable.filter((r) => {
      if (supplier && r.supplier !== supplier) return false;
      if (!q) return true;
      return [r.code, r.product, r.spec1, r.spec2, r.supplier, r.origin]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [priceTable, query, supplier]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const updateRow = (id, field, value) => {
    onChange(priceTable.map((r) => (r.id === id ? { ...r, [field]: NUM_FIELDS.includes(field) ? value : value } : r)));
  };
  const addRow = () => { onChange([emptyPriceRow(), ...priceTable]); setPage(0); };
  const deleteRow = (id) => {
    if (!confirm('이 품목을 삭제할까요?')) return;
    onChange(priceTable.filter((r) => r.id !== id));
  };

  const handleImport = async (files) => {
    if (!files || !files.length) return;
    try {
      setStatus({ type: 'info', msg: '엑셀 분석 중...' });
      const buf = await files[0].arrayBuffer();
      const { rows, sheetName } = parsePriceTableFromExcel(buf);
      if (priceTable.length && !confirm(`현재 단가표 ${priceTable.length}개를 새로 불러온 ${rows.length}개로 교체할까요?`)) {
        setStatus(null); return;
      }
      onChange(rows);
      setStatus({ type: 'success', msg: `✅ "${sheetName}" 시트에서 ${rows.length}개 품목을 불러왔습니다.` });
      setPage(0);
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applyToOrders = () => {
    if (!onApplyToOrders) return;
    if (!priceTable.length) { setStatus({ type: 'error', msg: '단가표가 비어 있습니다.' }); return; }
    const res = onApplyToOrders();
    setStatus({
      type: res.updated > 0 ? 'success' : 'info',
      msg: `📦 주문 ${res.matched.toLocaleString()}건 매칭 · ${res.updated.toLocaleString()}건의 매입가·매입배송비를 단가표 기준으로 갱신했습니다.`
    });
  };

  const cell = (r, field, { width = 70, type = 'text', align = 'left' } = {}) => (
    <input
      className="input"
      type={type}
      value={r[field] ?? ''}
      onChange={(e) => updateRow(r.id, field, type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
      style={{ width, fontSize: 12, padding: '2px 4px', textAlign: align }}
    />
  );

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">💲 매입단가표</div>
            <div className="card-subtitle">
              업체별 매입 단가표를 관리합니다. 총매입가 = 단가 + 매입배송비 (자동). 변경은 자동 저장·동기화됩니다.
            </div>
          </div>
          <div className="filter-group">
            <button className="btn primary" onClick={addRow}>+ 품목 추가</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>📥 엑셀로 불러오기</button>
            {onApplyToOrders && (
              <button className="btn" onClick={applyToOrders} title="단가표의 단가·매입배송비를 업체+제품+규격이 맞는 주문에 채웁니다">
                📦 주문 매입가 채우기
              </button>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => handleImport(e.target.files)} />
          </div>
        </div>

        <div className="filter-group" style={{ gap: 8, marginBottom: 8 }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="코드 / 제품 / 규격 / 업체 / 생산지 검색"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          />
          <select className="select" value={supplier} onChange={(e) => { setSupplier(e.target.value); setPage(0); }}>
            <option value="">전체 업체</option>
            {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="badge">{filtered.length.toLocaleString()} / {priceTable.length.toLocaleString()}개</span>
        </div>

        {status && (
          <div style={{
            marginBottom: 8, padding: 10, borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: status.type === 'error' ? 'var(--danger-soft)' : status.type === 'success' ? 'var(--success-soft)' : 'var(--primary-soft)',
            color: status.type === 'error' ? 'var(--danger)' : status.type === 'success' ? 'var(--success)' : 'var(--primary)'
          }}>{status.msg}</div>
        )}

        {priceTable.length === 0 ? (
          <div className="empty-state" style={{ padding: 28 }}>
            <p>단가표가 비어 있습니다. <strong>📥 엑셀로 불러오기</strong>로 기존 단가표 파일을 올리거나 <strong>+ 품목 추가</strong>로 직접 입력하세요.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    <th>코드</th><th>과세</th><th>업체</th><th>제품</th><th>규격1</th><th>규격2</th><th>생산지</th>
                    <th>수량</th><th>단위</th>
                    <th style={{ textAlign: 'right' }}>단가</th>
                    <th style={{ textAlign: 'right' }}>매입배송비</th>
                    <th style={{ textAlign: 'right' }}>총매입가</th>
                    <th>판매배송비</th>
                    <th style={{ textAlign: 'right' }}>판매가</th>
                    <th style={{ textAlign: 'right' }}>네이버</th>
                    <th style={{ textAlign: 'right' }}>쿠팡</th>
                    <th style={{ textAlign: 'right' }}>톡딜</th>
                    <th style={{ textAlign: 'right' }}>11번가</th>
                    <th style={{ textAlign: 'right' }}>옥션&G</th>
                    <th>택배사</th><th>비고</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id}>
                      <td>{cell(r, 'code', { width: 110 })}</td>
                      <td>{cell(r, 'taxType', { width: 46 })}</td>
                      <td>{cell(r, 'supplier', { width: 80 })}</td>
                      <td>{cell(r, 'product', { width: 70 })}</td>
                      <td>{cell(r, 'spec1', { width: 64 })}</td>
                      <td>{cell(r, 'spec2', { width: 74 })}</td>
                      <td>{cell(r, 'origin', { width: 60 })}</td>
                      <td>{cell(r, 'qty', { width: 44, align: 'right' })}</td>
                      <td>{cell(r, 'unit', { width: 40 })}</td>
                      <td>{cell(r, 'unitPrice', { width: 72, type: 'number', align: 'right' })}</td>
                      <td>{cell(r, 'inboundShip', { width: 72, type: 'number', align: 'right' })}</td>
                      <td className="num" style={{ fontWeight: 700, background: 'var(--bg-page)' }}>{fmtKRW(totalCost(r))}</td>
                      <td>{cell(r, 'saleShip', { width: 56 })}</td>
                      <td>{cell(r, 'salePrice', { width: 72, type: 'number', align: 'right' })}</td>
                      <td>{cell(r, 'priceNaver', { width: 68, type: 'number', align: 'right' })}</td>
                      <td>{cell(r, 'priceCoupang', { width: 68, type: 'number', align: 'right' })}</td>
                      <td>{cell(r, 'priceTokdeal', { width: 68, type: 'number', align: 'right' })}</td>
                      <td>{cell(r, 'price11st', { width: 68, type: 'number', align: 'right' })}</td>
                      <td>{cell(r, 'priceAuctionG', { width: 68, type: 'number', align: 'right' })}</td>
                      <td>{cell(r, 'courier', { width: 70 })}</td>
                      <td>{cell(r, 'note', { width: 110 })}</td>
                      <td>
                        <button className="btn danger" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => deleteRow(r.id)}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="filter-group" style={{ marginTop: 10, justifyContent: 'center' }}>
                <button className="btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>← 이전</button>
                <span className="badge">{safePage + 1} / {totalPages}</span>
                <button className="btn" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>다음 →</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
