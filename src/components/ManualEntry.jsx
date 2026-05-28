import React, { useMemo, useState } from 'react';
import { fmtKRW } from '../utils/format.js';
import { todayISO } from '../utils/dateUtils.js';
import {
  suggestPrice,
  suggestCost,
  suggestFeeRate,
  suggestShipping,
  getProductSuggestions,
  getSpecSuggestions,
  buildCatalog
} from '../utils/priceBook.js';
import { getUniqueValues } from '../utils/analytics.js';
import { guessPurchaseExempt } from '../utils/vat.js';

const EMPTY = {
  date: todayISO(),
  orderTime: '',
  dispatchDate: '',
  business: '',
  taxType: '',
  supplier: '',
  platform: '',
  product: '',
  spec: '',
  quantity: '1',
  revenue: '',
  cost: '',
  shipping: '',
  fee: '',
  vat: '',
  purchaseExempt: null, // null=자동(매입처로 추정), true/false=수동 지정
  note: ''
};

const PAGE_SIZE = 50;

export default function ManualEntry({ rows, onAdd, onDelete, onBulkSetDispatch, onAutoVat }) {
  const [form, setForm] = useState(EMPTY);
  const [editingIdx, setEditingIdx] = useState(null);
  const [suggestions, setSuggestions] = useState({});
  const [listFilter, setListFilter] = useState({ from: '', to: '', q: '', business: '', supplier: '', platform: '' });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkDispatch, setBulkDispatch] = useState(() => new Date().toISOString().slice(0, 10));

  const businesses = useMemo(() => getUniqueValues(rows, 'business'), [rows]);
  const suppliers = useMemo(() => getUniqueValues(rows, 'supplier'), [rows]);
  const platforms = useMemo(() => getUniqueValues(rows, 'platform'), [rows]);
  const products = useMemo(() => getProductSuggestions(rows, ''), [rows]);
  const specs = useMemo(() => getSpecSuggestions(rows, form.product), [rows, form.product]);
  const catalog = useMemo(() => buildCatalog(rows).slice(0, 12), [rows]);

  // 카탈로그 칩 클릭 → 폼 자동 채움
  const quickFill = (item) => {
    // 해당 제품의 가장 최근 주문 1건을 찾아 폼에 적용
    const recent = rows
      .filter((r) => r.product === item.product && r.spec === item.spec)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!recent) return;
    const next = {
      ...form,
      business: recent.business || form.business,
      taxType: recent.taxType || form.taxType,
      supplier: recent.supplier || '',
      platform: recent.platform || form.platform,
      product: recent.product,
      spec: recent.spec || '',
      quantity: '1',
      revenue: String(recent.revenue),
      cost: String(recent.cost),
      shipping: String(recent.shipping || 0),
      fee: String(recent.fee || 0),
      vat: String(recent.vat || 0),
      note: ''
    };
    setForm(next);
    recomputeSuggestions(next);
  };

  // 자동 단가 제안 - 폼 값이 바뀔 때마다 재계산
  function recomputeSuggestions(nextForm) {
    const s = {};
    if (nextForm.product) {
      // 판매가
      if (nextForm.platform) {
        s.price = suggestPrice(rows, {
          product: nextForm.product,
          spec: nextForm.spec,
          platform: nextForm.platform
        });
      }
      // 매입가
      if (nextForm.supplier) {
        s.cost = suggestCost(rows, {
          product: nextForm.product,
          spec: nextForm.spec,
          supplier: nextForm.supplier
        });
      }
      // 배송비
      if (nextForm.supplier) {
        s.shipping = suggestShipping(rows, {
          supplier: nextForm.supplier,
          product: nextForm.product
        });
      }
    }
    // 수수료율
    if (nextForm.platform) {
      s.feeRate = suggestFeeRate(rows, nextForm.platform);
    }
    setSuggestions(s);
  }

  const update = (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    recomputeSuggestions(next);
  };

  const applySuggestion = (field, value) => {
    update({ [field]: String(value) });
  };

  // 수수료 자동 계산 (매출 × 수수료율)
  const autoFee = () => {
    if (suggestions.feeRate?.rate && form.revenue) {
      update({ fee: String(Math.round(Number(form.revenue) * suggestions.feeRate.rate)) });
    }
  };

  // 부가세 = 매출부가세(주문금액÷11) − 매입부가세(매입가÷11)
  // 매출 면세(면세 사업자) → 매출부가세 0, 매입 면세(농수산물 등) → 매입부가세 0
  const isSaleExempt = form.taxType === '면세';
  const purchaseExempt =
    form.purchaseExempt == null ? guessPurchaseExempt(form.supplier) : form.purchaseExempt;
  const salesVat = isSaleExempt ? 0 : Math.round((Number(form.revenue) || 0) / 11);
  const purchaseVat =
    isSaleExempt || purchaseExempt ? 0 : Math.round((Number(form.cost) || 0) / 11);
  const vatSuggest = salesVat - purchaseVat;

  // 부가세 자동 (과세사업자: 매출부가세 − 매입부가세)
  const autoVat = () => {
    update({ vat: String(vatSuggest) });
  };

  // 사업자 선택 시 면세/과세 자동 설정
  const onBusinessChange = (v) => {
    const patch = { business: v };
    if (v === '그로븐' || v === '디네트') patch.taxType = '면세';
    else if (v === '옐로우브릿지') patch.taxType = '과세';
    if (patch.taxType === '면세') patch.vat = '0';
    update(patch);
  };

  // 과세/면세 변경 시: 면세면 부가세 0 자동
  const onTaxTypeChange = (v) => {
    const patch = { taxType: v };
    if (v === '면세') patch.vat = '0';
    update(patch);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // 수정 시 폼에 없는 필드(수취인·연락처·주소·주문번호·송장 등)는 원본 값 유지
    const base = (editingIdx !== null && editingIdx !== undefined) ? (rows[editingIdx] || {}) : {};
    const row = {
      ...base,
      date: form.date,
      orderTime: form.orderTime || '',
      dispatchDate: form.dispatchDate || '',
      business: form.business.trim() || '미지정',
      taxType: form.taxType,
      supplier: form.supplier.trim(),
      platform: form.platform.trim(),
      product: form.product.trim(),
      spec: form.spec.trim(),
      quantity: Number(form.quantity) || 1,
      revenue: Number(form.revenue) || 0,
      cost: Number(form.cost) || 0,
      shipping: Number(form.shipping) || 0,
      fee: Number(form.fee) || 0,
      vat: Number(form.vat) || 0,
      labor: base.labor || 0,
      ad: base.ad || 0,
      note: form.note.trim()
    };
    onAdd(row, editingIdx);
    const reset = { ...EMPTY, date: form.date, business: form.business, platform: form.platform };
    setForm(reset);
    setEditingIdx(null);
    setSuggestions({});
  };

  const updateFilter = (patch) => {
    setListFilter((f) => ({ ...f, ...patch }));
    setPage(0);
  };

  // 전체 주문을 기간·검색·사업자로 필터링 (원본 인덱스 유지하여 수정/삭제 가능)
  const filteredList = useMemo(() => {
    const q = listFilter.q.trim().toLowerCase();
    const out = [];
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      if (listFilter.from && (r.date || '') < listFilter.from) continue;
      if (listFilter.to && (r.date || '') > listFilter.to) continue;
      if (listFilter.business && r.business !== listFilter.business) continue;
      if (listFilter.supplier && r.supplier !== listFilter.supplier) continue;
      if (listFilter.platform && r.platform !== listFilter.platform) continue;
      if (q) {
        const hay = [r.product, r.spec, r.supplier, r.platform, r.recipient, r.phone, r.orderNo, r.note]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) continue;
      }
      out.push({ r, idx });
    }
    out.sort((a, b) => (b.r.date || '').localeCompare(a.r.date || '') || b.idx - a.idx);
    return out;
  }, [rows, listFilter]);

  const total = filteredList.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filteredList.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const allFilteredSelected = total > 0 && filteredList.every(({ idx }) => selected.has(idx));
  const toggleOne = (idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };
  const toggleAllFiltered = () => {
    setSelected((prev) => {
      if (allFilteredSelected) return new Set();
      const next = new Set(prev);
      for (const { idx } of filteredList) next.add(idx);
      return next;
    });
  };
  const applyBulkDispatch = () => {
    if (!selected.size || !bulkDispatch || !onBulkSetDispatch) return;
    if (!confirm(`선택한 ${selected.size.toLocaleString()}건의 발주일자를 ${bulkDispatch}(으)로 변경합니다.\n진행할까요?`)) return;
    onBulkSetDispatch([...selected], bulkDispatch);
    setSelected(new Set());
  };

  const taxableCount = useMemo(() => rows.filter((r) => r.taxType === '과세').length, [rows]);
  const autoVatAll = () => {
    if (!onAutoVat) return;
    if (!confirm(`과세로 등록된 ${taxableCount}건의 부가세를 매출부가세−매입부가세로 자동 계산해 채웁니다.\n(매입처가 농수산 면세면 매입부가세는 0)\n진행할까요?`)) return;
    onAutoVat(null);
  };
  const autoVatSelected = () => {
    if (!onAutoVat || !selected.size) return;
    onAutoVat([...selected]);
    setSelected(new Set());
  };

  const startEdit = (r, idx) => {
    setForm({
      date: r.date, orderTime: r.orderTime || '', dispatchDate: r.dispatchDate || '', business: r.business, taxType: r.taxType || '',
      supplier: r.supplier || '', platform: r.platform || '',
      product: r.product || '', spec: r.spec || '',
      quantity: String(r.quantity || 1),
      revenue: String(r.revenue), cost: String(r.cost),
      shipping: String(r.shipping || 0), fee: String(r.fee || 0),
      vat: String(r.vat || 0), purchaseExempt: null, note: r.note || ''
    });
    setEditingIdx(idx);
    recomputeSuggestions({ product: r.product, spec: r.spec, platform: r.platform, supplier: r.supplier });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">
            {editingIdx !== null ? '✏️ 데이터 수정' : '➕ 주문 한 건 입력'}
          </div>
          <div className="card-subtitle">
            제품·규격·판매처를 선택하면 이전 이력 기반으로 단가·수수료가 자동 제안됩니다.
          </div>
        </div>
      </div>

      {catalog.length > 0 && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            background: 'var(--primary-soft)',
            borderRadius: 8
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--primary)' }}>
            ⚡ 자주 입력한 제품 (클릭하면 최근 주문 그대로 채워집니다)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {catalog.map((item) => (
              <button
                key={`${item.product}|${item.spec}`}
                type="button"
                onClick={() => quickFill(item)}
                style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
                title={`${item.orders}건 · 평균 ${item.avgPrice.toLocaleString()}원`}
              >
                {item.product}
                {item.spec && (
                  <span className="muted" style={{ fontWeight: 400 }}>· {item.spec}</span>
                )}
                <span
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    borderRadius: 999,
                    padding: '0 6px',
                    fontSize: 10,
                    marginLeft: 2
                  }}
                >
                  {item.orders}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 행 1: 기본 정보 */}
        <div className="form-grid">
          <Field label="주문일자 (고객 주문)">
            <input type="date" className="input" required value={form.date}
              onChange={(e) => update({ date: e.target.value })} />
          </Field>
          <Field label="주문시간">
            <input type="time" className="input" value={form.orderTime}
              onChange={(e) => update({ orderTime: e.target.value })} />
          </Field>
          <Field label="발주일자 (보고 기준)">
            <input type="date" className="input" value={form.dispatchDate}
              onChange={(e) => update({ dispatchDate: e.target.value })} />
          </Field>
          <Field label="사업자">
            <input className="input" list="biz-list" value={form.business} placeholder="그로븐 / 옐로우브릿지"
              onChange={(e) => onBusinessChange(e.target.value)} />
            <datalist id="biz-list">
              {businesses.length ? businesses.map((b) => <option key={b} value={b} />) :
                ['그로븐', '옐로우브릿지', '디네트'].map((b) => <option key={b} value={b} />)}
            </datalist>
          </Field>
          <Field label="과세">
            <select className="select" value={form.taxType} onChange={(e) => onTaxTypeChange(e.target.value)}>
              <option value="">-</option>
              <option value="면세">면세</option>
              <option value="과세">과세</option>
            </select>
          </Field>
          <Field label="매입처">
            <input className="input" list="sup-list" value={form.supplier} placeholder="일비/도매꾹/해담별..."
              onChange={(e) => update({ supplier: e.target.value })} />
            <datalist id="sup-list">
              {suppliers.map((s) => <option key={s} value={s} />)}
            </datalist>
          </Field>
          <Field label="판매처(채널)">
            <input className="input" list="plat-list" value={form.platform} placeholder="쿠팡/스마트스토어/11번가..."
              onChange={(e) => update({ platform: e.target.value })} />
            <datalist id="plat-list">
              {platforms.length ? platforms.map((p) => <option key={p} value={p} />) :
                ['쿠팡','스마트스토어','11번가','지마켓','옥션','톡딜','네이버','당근'].map((p) => <option key={p} value={p} />)}
            </datalist>
          </Field>
        </div>

        {/* 행 2: 제품 정보 */}
        <div className="form-grid">
          <Field label="제품명">
            <input className="input" list="prod-list" value={form.product} placeholder="박대/간고등어/영광굴비..."
              onChange={(e) => update({ product: e.target.value })} />
            <datalist id="prod-list">
              {products.map((p) => <option key={p} value={p} />)}
            </datalist>
          </Field>
          <Field label="규격">
            <input className="input" list="spec-list" value={form.spec} placeholder="32cm 내외 10미 / 140g..."
              onChange={(e) => update({ spec: e.target.value })} />
            <datalist id="spec-list">
              {specs.map((s) => <option key={s} value={s} />)}
            </datalist>
          </Field>
          <Field label="수량">
            <input type="number" min="1" className="input" value={form.quantity}
              onChange={(e) => update({ quantity: e.target.value })} />
          </Field>
        </div>

        {/* 행 3: 금액 */}
        <div className="form-grid">
          <Field
            label="주문금액"
            hint={suggestions.price && (
              <SuggestChip
                value={suggestions.price.value}
                samples={suggestions.price.samples}
                onClick={() => applySuggestion('revenue', suggestions.price.value)}
              />
            )}
          >
            <input type="number" required className="input" value={form.revenue}
              onChange={(e) => update({ revenue: e.target.value })} />
          </Field>
          <Field
            label="매입가"
            hint={suggestions.cost && (
              <SuggestChip
                value={suggestions.cost.value}
                samples={suggestions.cost.samples}
                onClick={() => applySuggestion('cost', suggestions.cost.value)}
              />
            )}
          >
            <input type="number" className="input" value={form.cost}
              onChange={(e) => update({ cost: e.target.value })} />
          </Field>
          <Field
            label="배송비"
            hint={suggestions.shipping && (
              <SuggestChip
                value={suggestions.shipping.value}
                samples={suggestions.shipping.samples}
                onClick={() => applySuggestion('shipping', suggestions.shipping.value)}
              />
            )}
          >
            <input type="number" className="input" value={form.shipping}
              onChange={(e) => update({ shipping: e.target.value })} />
          </Field>
          <Field
            label={
              <>
                판매수수료{' '}
                <button type="button" className="btn sm" onClick={autoFee}
                  disabled={!suggestions.feeRate?.rate || !form.revenue}>
                  자동
                </button>
              </>
            }
            hint={suggestions.feeRate?.rate && (
              <span className="muted text-xs">
                {(suggestions.feeRate.rate * 100).toFixed(1)}% ({suggestions.feeRate.basis === 'default' ? '기본값' : '이력'})
              </span>
            )}
          >
            <input type="number" className="input" value={form.fee}
              onChange={(e) => update({ fee: e.target.value })} />
          </Field>
          <Field
            label={
              <>
                부가세{' '}
                <button type="button" className="btn sm" onClick={autoVat}>과세</button>{' '}
                <button type="button" className="btn sm" onClick={() => update({ vat: '0' })}>면세</button>
              </>
            }
            hint={
              isSaleExempt ? (
                <span className="muted text-xs">면세 사업자 → 부가세 0원</span>
              ) : (
                <div className="text-xs" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  {(form.revenue || form.cost) ? (
                    <button
                      type="button"
                      onClick={() => applySuggestion('vat', vatSuggest)}
                      style={{
                        background: 'var(--primary-soft)', color: 'var(--primary)', border: 'none',
                        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer'
                      }}
                      title="매출부가세 − 매입부가세"
                    >
                      💡 추천: {fmtKRW(vatSuggest)}
                    </button>
                  ) : null}
                  <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={purchaseExempt}
                      onChange={(e) => update({ purchaseExempt: e.target.checked })}
                    />
                    매입 면세(농수산물)
                  </label>
                  <span className="muted">
                    매출부가세 {fmtKRW(salesVat)} − 매입부가세 {fmtKRW(purchaseVat)}
                  </span>
                </div>
              )
            }
          >
            <input type="number" className="input" value={form.vat}
              onChange={(e) => update({ vat: e.target.value })} />
          </Field>
        </div>

        {/* 행 4: 비고 */}
        <div style={{ marginTop: 10 }}>
          <Field label="비고">
            <input className="input" value={form.note}
              onChange={(e) => update({ note: e.target.value })} />
          </Field>
        </div>

        {/* 마진 미리보기 */}
        <MarginPreview form={form} />

        <div className="row" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary">
            {editingIdx !== null ? '수정 저장' : '+ 추가'}
          </button>
          {editingIdx !== null && (
            <button type="button" className="btn"
              onClick={() => { setForm(EMPTY); setEditingIdx(null); setSuggestions({}); }}>
              취소
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop: 22 }}>
        <div className="card-header" style={{ marginBottom: 8 }}>
          <div>
            <div className="card-subtitle">
              전체 주문 {rows.length.toLocaleString()}건 · 필터 결과 {total.toLocaleString()}건
            </div>
            <button className="btn sm" style={{ marginTop: 6 }} onClick={autoVatAll}>
              ⚡ 과세 {taxableCount.toLocaleString()}건 부가세 자동계산
            </button>
          </div>
          <div className="filter-group" style={{ flexWrap: 'wrap', gap: 6 }}>
            <input type="date" className="input" value={listFilter.from}
              onChange={(e) => updateFilter({ from: e.target.value })} title="시작일" />
            <span className="muted">~</span>
            <input type="date" className="input" value={listFilter.to}
              onChange={(e) => updateFilter({ to: e.target.value })} title="종료일" />
            <select className="select" value={listFilter.business}
              onChange={(e) => updateFilter({ business: e.target.value })}>
              <option value="">전체 사업자</option>
              {businesses.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="select" value={listFilter.supplier}
              onChange={(e) => updateFilter({ supplier: e.target.value })}>
              <option value="">전체 매입처</option>
              {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="select" value={listFilter.platform}
              onChange={(e) => updateFilter({ platform: e.target.value })}>
              <option value="">전체 판매처</option>
              {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className="input" placeholder="제품/수취인/주문번호 검색"
              value={listFilter.q} onChange={(e) => updateFilter({ q: e.target.value })}
              style={{ minWidth: 180 }} />
            {(listFilter.from || listFilter.to || listFilter.q || listFilter.business || listFilter.supplier || listFilter.platform) && (
              <button className="btn" onClick={() => updateFilter({ from: '', to: '', q: '', business: '', supplier: '', platform: '' })}>
                필터 해제
              </button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="filter-group" style={{ marginBottom: 8, padding: 8, background: 'var(--primary-soft)', borderRadius: 6, alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 13, color: 'var(--primary)' }}>선택 {selected.size}건</strong>
            <span className="muted text-xs">발주일자 일괄 변경:</span>
            <input type="date" className="input" value={bulkDispatch}
              onChange={(e) => setBulkDispatch(e.target.value)} style={{ width: 160 }} />
            <button className="btn primary sm" onClick={applyBulkDispatch}>선택 건 발주일자 적용</button>
            <button className="btn sm" onClick={autoVatSelected}>부가세 자동계산</button>
            <button className="btn sm" onClick={() => setSelected(new Set())}>선택 해제</button>
          </div>
        )}

        {total === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>표시할 주문이 없습니다.</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    <th style={{ width: 28 }}>
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered}
                        title="필터된 전체 선택/해제" />
                    </th>
                    <th>주문일자</th>
                    <th>주문시간</th>
                    <th>발주일자</th>
                    <th>사업자</th>
                    <th>과세</th>
                    <th>매입처</th>
                    <th>판매처</th>
                    <th>제품</th>
                    <th>규격</th>
                    <th style={{ textAlign: 'right' }}>수량</th>
                    <th style={{ textAlign: 'right' }}>매출</th>
                    <th style={{ textAlign: 'right' }}>매입가</th>
                    <th style={{ textAlign: 'right' }}>매입배송비</th>
                    <th style={{ textAlign: 'right' }}>부가세</th>
                    <th style={{ textAlign: 'right' }}>마진</th>
                    <th>수취인</th>
                    <th>연락처</th>
                    <th>주소</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(({ r, idx }) => {
                    const qty = r.quantity || 1;
                    const margin = r.revenue - (r.cost || 0) - (r.shipping || 0) - (r.fee || 0) - (r.vat || 0);
                    return (
                      <tr key={idx} style={{ background: editingIdx === idx ? 'var(--primary-soft)' : (selected.has(idx) ? 'var(--bg-page)' : undefined) }}>
                        <td>
                          <input type="checkbox" checked={selected.has(idx)} onChange={() => toggleOne(idx)} />
                        </td>
                        <td>{r.date}</td>
                        <td className="muted">{r.orderTime || '—'}</td>
                        <td>{r.dispatchDate || '—'}</td>
                        <td>{r.business}</td>
                        <td className="muted">{r.taxType || ''}</td>
                        <td>{r.supplier || ''}</td>
                        <td>{r.platform || ''}</td>
                        <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.product || ''}>{r.product || ''}</td>
                        <td className="muted" style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.spec || ''}>{r.spec || ''}</td>
                        <td className="num">{qty}</td>
                        <td className="num">{fmtKRW(r.revenue)}</td>
                        <td className="num">{fmtKRW(r.cost)}</td>
                        <td className="num" style={{ color: (r.shipping || 0) > 0 ? 'var(--warning)' : 'var(--muted)' }}>
                          {(r.shipping || 0) > 0 ? fmtKRW(r.shipping) : '—'}
                        </td>
                        <td className="num">{fmtKRW(r.vat || 0)}</td>
                        <td className={`num ${margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(margin)}</td>
                        <td>{r.recipient || '—'}</td>
                        <td className="muted">{r.phone || '—'}</td>
                        <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--muted)' }} title={r.address || ''}>{r.address || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn sm" onClick={() => startEdit(r, idx)}>수정</button>{' '}
                          <button className="btn sm danger" onClick={() => { onDelete(idx); setSelected(new Set()); }}>삭제</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="row" style={{ marginTop: 10, alignItems: 'center', gap: 8 }}>
                <button className="btn sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>← 이전</button>
                <span className="muted text-xs">{safePage + 1} / {pageCount} 페이지</span>
                <button className="btn sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>다음 →</button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      {children}
      {hint && <div style={{ fontSize: 11 }}>{hint}</div>}
    </label>
  );
}

function SuggestChip({ value, samples, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'var(--primary-soft)',
        color: 'var(--primary)',
        border: 'none',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer'
      }}
      title={`이력 ${samples}건 기준`}
    >
      💡 추천: {fmtKRW(value)}
    </button>
  );
}

function MarginPreview({ form }) {
  const rev = Number(form.revenue) || 0;
  const cost = Number(form.cost) || 0;
  const ship = Number(form.shipping) || 0;
  const fee = Number(form.fee) || 0;
  const vat = Number(form.vat) || 0;
  const margin = rev - cost - ship - fee - vat;
  const rate = rev ? (margin / rev) * 100 : 0;
  if (!rev) return null;
  return (
    <div
      style={{
        marginTop: 12,
        padding: 10,
        borderRadius: 8,
        background: margin >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)',
        color: margin >= 0 ? 'var(--success)' : 'var(--danger)',
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        justifyContent: 'space-between'
      }}
    >
      <span>
        예상 마진: <strong>{fmtKRW(margin)}</strong> ({rate.toFixed(1)}%)
      </span>
      <span style={{ fontSize: 11, fontWeight: 500 }}>
        매출 {fmtKRW(rev)} − 매입 {fmtKRW(cost)} − 배송 {fmtKRW(ship)} − 수수료 {fmtKRW(fee)} − 부가세 {fmtKRW(vat)}
      </span>
    </div>
  );
}
