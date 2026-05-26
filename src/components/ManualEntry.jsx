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

const EMPTY = {
  date: todayISO(),
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
  ad: '',
  note: ''
};

export default function ManualEntry({ rows, onAdd, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const [editingIdx, setEditingIdx] = useState(null);
  const [suggestions, setSuggestions] = useState({});

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

  // 부가세 자동 (과세사업자: 매출/11)
  const autoVat = () => {
    if (form.revenue) update({ vat: String(Math.round(Number(form.revenue) / 11)) });
  };

  // 사업자 선택 시 면세/과세 자동 설정
  const onBusinessChange = (v) => {
    const patch = { business: v };
    if (v === '그로븐' || v === '디네트') patch.taxType = '면세';
    else if (v === '옐로우브릿지') patch.taxType = '과세';
    update(patch);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const row = {
      date: form.date,
      dispatchDate: '',
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
      labor: 0,
      ad: Number(form.ad) || 0,
      note: form.note.trim()
    };
    onAdd(row, editingIdx);
    const reset = { ...EMPTY, date: form.date, business: form.business, platform: form.platform, ad: '' };
    setForm(reset);
    setEditingIdx(null);
    setSuggestions({});
  };

  const recent = rows.slice(-15).reverse();

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
          <Field label="주문일">
            <input type="date" className="input" required value={form.date}
              onChange={(e) => update({ date: e.target.value })} />
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
            <select className="select" value={form.taxType} onChange={(e) => update({ taxType: e.target.value })}>
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
          >
            <input type="number" className="input" value={form.vat}
              onChange={(e) => update({ vat: e.target.value })} />
          </Field>
          <Field label="광고비">
            <input type="number" className="input" value={form.ad} placeholder="0"
              onChange={(e) => update({ ad: e.target.value })} />
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

      {recent.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="card-subtitle mb-8">최근 입력 (최대 15건)</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>사업자</th>
                  <th>판매처</th>
                  <th>제품</th>
                  <th>규격</th>
                  <th>매출</th>
                  <th>매입</th>
                  <th>마진</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => {
                  const realIdx = rows.length - 1 - i;
                  const margin = r.revenue - r.cost - r.shipping - r.fee - r.vat;
                  return (
                    <tr key={realIdx}>
                      <td>{r.date}</td>
                      <td>{r.business}</td>
                      <td>{r.platform}</td>
                      <td>{r.product}</td>
                      <td className="muted text-xs">{r.spec}</td>
                      <td className="num">{fmtKRW(r.revenue)}</td>
                      <td className="num">{fmtKRW(r.cost)}</td>
                      <td className={`num ${margin >= 0 ? 'pos' : 'neg'}`}>{fmtKRW(margin)}</td>
                      <td>
                        <button className="btn sm" onClick={() => {
                          setForm({
                            date: r.date, business: r.business, taxType: r.taxType || '',
                            supplier: r.supplier || '', platform: r.platform || '',
                            product: r.product || '', spec: r.spec || '',
                            quantity: String(r.quantity || 1),
                            revenue: String(r.revenue), cost: String(r.cost),
                            shipping: String(r.shipping || 0), fee: String(r.fee || 0),
                            vat: String(r.vat || 0), ad: String(r.ad || 0), note: r.note || ''
                          });
                          setEditingIdx(realIdx);
                          recomputeSuggestions({ product: r.product, spec: r.spec, platform: r.platform, supplier: r.supplier });
                        }}>수정</button>{' '}
                        <button className="btn sm danger" onClick={() => onDelete(realIdx)}>삭제</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
  const ad = Number(form.ad) || 0;
  const margin = rev - cost - ship - fee - vat - ad;
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
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 4
      }}
    >
      <span>
        예상 마진: <strong>{fmtKRW(margin)}</strong> ({rate.toFixed(1)}%)
      </span>
      <span style={{ fontSize: 11, fontWeight: 500 }}>
        매출 {fmtKRW(rev)} − 매입 {fmtKRW(cost)} − 배송 {fmtKRW(ship)} − 수수료 {fmtKRW(fee)} − 부가세 {fmtKRW(vat)}
        {ad > 0 && ` − 광고비 ${fmtKRW(ad)}`}
      </span>
    </div>
  );
}
