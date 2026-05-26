import React, { useMemo, useState } from 'react';
import { fmtKRW } from '../utils/format.js';
import { getUniqueValues } from '../utils/analytics.js';

export default function AdCostManager({ rows, adCosts, onChange }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [business, setBusiness] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const businesses = useMemo(() => getUniqueValues(rows, 'business'), [rows]);

  const add = () => {
    const amt = Number(amount);
    if (!month || !amt) {
      alert('월과 광고비 금액을 입력해주세요.');
      return;
    }
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      month,
      business: business || '',
      amount: amt,
      memo: memo.trim()
    };
    onChange([...adCosts, entry]);
    setAmount('');
    setMemo('');
  };

  const remove = (id) => {
    if (!confirm('이 광고비 항목을 삭제할까요?')) return;
    onChange(adCosts.filter((e) => e.id !== id));
  };

  const sorted = [...adCosts].sort((a, b) => b.month.localeCompare(a.month));
  const dim = (() => {
    const [y, m] = month.split('-').map(Number);
    return y && m ? new Date(y, m, 0).getDate() : 0;
  })();
  const dailyPreview = Number(amount) && dim ? Number(amount) / dim : 0;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">📣 월별 광고비 입력</div>
          <div className="card-subtitle">
            월 단위로 광고비를 넣으면 그 달의 일수로 자동 나눠(일할계산) 일자별 마진에 반영됩니다.
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
          alignItems: 'end'
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>월</span>
          <input type="month" className="input" value={month}
            onChange={(e) => setMonth(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>사업자 (선택)</span>
          <input className="input" list="adbiz-list" value={business} placeholder="전체"
            onChange={(e) => setBusiness(e.target.value)} />
          <datalist id="adbiz-list">
            {businesses.map((b) => <option key={b} value={b} />)}
          </datalist>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>광고비 (월)</span>
          <input type="number" className="input" value={amount} placeholder="예: 300000"
            onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>메모 (선택)</span>
          <input className="input" value={memo} placeholder="쿠팡 광고 등"
            onChange={(e) => setMemo(e.target.value)} />
        </label>
        <button className="btn primary" onClick={add} style={{ height: 38 }}>+ 추가</button>
      </div>

      {dailyPreview > 0 && (
        <div className="muted text-xs" style={{ marginTop: 8 }}>
          💡 일할 단가: {fmtKRW(dailyPreview)} / 일 ({dim}일 기준)
        </div>
      )}

      {sorted.length > 0 ? (
        <div style={{ overflowX: 'auto', marginTop: 14 }}>
          <table className="table">
            <thead>
              <tr>
                <th>월</th>
                <th>사업자</th>
                <th>광고비</th>
                <th>일할 단가</th>
                <th>메모</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => {
                const [y, m] = e.month.split('-').map(Number);
                const d = y && m ? new Date(y, m, 0).getDate() : 0;
                return (
                  <tr key={e.id}>
                    <td>{e.month}</td>
                    <td>{e.business || '전체'}</td>
                    <td className="num">{fmtKRW(e.amount)}</td>
                    <td className="num muted">{d ? fmtKRW(e.amount / d) : '-'}</td>
                    <td className="muted text-xs">{e.memo}</td>
                    <td>
                      <button className="btn sm danger" onClick={() => remove(e.id)}>삭제</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="muted text-sm" style={{ marginTop: 12 }}>
          아직 등록된 광고비가 없습니다. 위에서 월·금액을 입력해 추가하세요.
        </div>
      )}
    </div>
  );
}
