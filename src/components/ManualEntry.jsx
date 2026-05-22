import React, { useState } from 'react';
import { fmtKRW } from '../utils/format.js';
import { todayISO } from '../utils/dateUtils.js';

const EMPTY = {
  date: todayISO(),
  business: '',
  channel: '',
  revenue: '',
  cost: '',
  labor: '',
  ad: '',
  fee: '',
  vat: '',
  note: ''
};

export default function ManualEntry({ rows, onAdd, onDelete, businesses }) {
  const [form, setForm] = useState(EMPTY);
  const [editingIdx, setEditingIdx] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const row = {
      date: form.date,
      business: form.business.trim() || '미지정',
      channel: form.channel.trim(),
      revenue: Number(form.revenue) || 0,
      cost: Number(form.cost) || 0,
      labor: Number(form.labor) || 0,
      ad: Number(form.ad) || 0,
      fee: Number(form.fee) || 0,
      vat: Number(form.vat) || 0,
      note: form.note.trim()
    };
    onAdd(row, editingIdx);
    setForm(EMPTY);
    setEditingIdx(null);
  };

  // auto-suggest VAT (10% of revenue)
  const suggestVat = () => {
    if (form.revenue) {
      setForm({ ...form, vat: String(Math.round(Number(form.revenue) / 11)) });
    }
  };

  const recent = rows.slice(-20).reverse();

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{editingIdx !== null ? '데이터 수정' : '데이터 직접 입력'}</div>
          <div className="card-subtitle">한 건씩 빠르게 입력. 부가세는 매출의 1/11로 자동 산출 가능.</div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            marginBottom: 12
          }}
        >
          <Field label="날짜">
            <input
              type="date"
              className="input"
              value={form.date}
              required
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="사업자">
            <input
              className="input"
              list="biz-list"
              value={form.business}
              placeholder="사업자A"
              onChange={(e) => setForm({ ...form, business: e.target.value })}
            />
            <datalist id="biz-list">
              {businesses.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Field>
          <Field label="채널 (선택)">
            <input
              className="input"
              value={form.channel}
              placeholder="스마트스토어"
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
            />
          </Field>
          <Field label="매출">
            <input
              type="number"
              className="input"
              value={form.revenue}
              required
              onChange={(e) => setForm({ ...form, revenue: e.target.value })}
            />
          </Field>
          <Field label="매입">
            <input
              type="number"
              className="input"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </Field>
          <Field label="인건비">
            <input
              type="number"
              className="input"
              value={form.labor}
              onChange={(e) => setForm({ ...form, labor: e.target.value })}
            />
          </Field>
          <Field label="광고비">
            <input
              type="number"
              className="input"
              value={form.ad}
              onChange={(e) => setForm({ ...form, ad: e.target.value })}
            />
          </Field>
          <Field label="판매수수료">
            <input
              type="number"
              className="input"
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value })}
            />
          </Field>
          <Field label={<>부가세 <button type="button" className="btn sm" onClick={suggestVat} style={{ marginLeft: 4 }}>자동</button></>}>
            <input
              type="number"
              className="input"
              value={form.vat}
              onChange={(e) => setForm({ ...form, vat: e.target.value })}
            />
          </Field>
          <Field label="비고">
            <input
              className="input"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </Field>
        </div>
        <div className="row">
          <button type="submit" className="btn primary">
            {editingIdx !== null ? '수정 저장' : '+ 추가'}
          </button>
          {editingIdx !== null && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setForm(EMPTY);
                setEditingIdx(null);
              }}
            >
              취소
            </button>
          )}
        </div>
      </form>

      {recent.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="card-subtitle mb-8">최근 입력 (최대 20건)</div>
          <table className="table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>사업자</th>
                <th>채널</th>
                <th>매출</th>
                <th>매입</th>
                <th>비고</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => {
                const realIdx = rows.length - 1 - i;
                return (
                  <tr key={realIdx}>
                    <td>{r.date}</td>
                    <td>{r.business}</td>
                    <td>{r.channel}</td>
                    <td className="num">{fmtKRW(r.revenue)}</td>
                    <td className="num">{fmtKRW(r.cost)}</td>
                    <td>{r.note}</td>
                    <td>
                      <button
                        className="btn sm"
                        onClick={() => {
                          setForm({
                            date: r.date,
                            business: r.business,
                            channel: r.channel,
                            revenue: String(r.revenue),
                            cost: String(r.cost),
                            labor: String(r.labor),
                            ad: String(r.ad),
                            fee: String(r.fee),
                            vat: String(r.vat),
                            note: r.note
                          });
                          setEditingIdx(realIdx);
                        }}
                      >
                        수정
                      </button>{' '}
                      <button className="btn sm danger" onClick={() => onDelete(realIdx)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}
