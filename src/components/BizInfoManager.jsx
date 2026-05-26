import React, { useMemo, useState } from 'react';
import { formatBizNo, isValidBizNo } from '../utils/bizInfo.js';

const FIELDS = [
  { key: 'companyName', label: '정식 상호', placeholder: '예: 주식회사 일비', wide: true },
  { key: 'ceo', label: '대표자명', placeholder: '예: 홍길동' },
  { key: 'bizType', label: '업태', placeholder: '예: 도소매' },
  { key: 'bizItem', label: '종목', placeholder: '예: 수산물' },
  { key: 'payment', label: '결제방식', placeholder: '예: 계좌이체 / 카드 / 현금' },
  { key: 'items', label: '취급 품목', placeholder: '예: 박대, 굴비, 간고등어', wide: true },
  { key: 'address', label: '주소', placeholder: '예: 충남 ...', wide: true },
  { key: 'phone', label: '연락처', placeholder: '예: 010-0000-0000' },
  { key: 'fax', label: '팩스', placeholder: '예: 041-000-0000' },
  { key: 'email', label: '이메일', placeholder: '예: vendor@example.com' },
  { key: 'note', label: '비고', placeholder: '기타 메모', wide: true }
];

const blankEntry = (name) => ({
  name,
  bizNo: '',
  companyName: '',
  ceo: '',
  taxType: '',
  bizType: '',
  bizItem: '',
  payment: '',
  items: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  note: ''
});

export default function BizInfoManager({ suppliers, bizInfo, onChange }) {
  const [newName, setNewName] = useState('');
  const [query, setQuery] = useState('');

  // 데이터에 등장한 거래처 + 이미 등록된 거래처명 합치기
  const names = useMemo(() => {
    const set = new Set();
    for (const s of suppliers || []) if (s) set.add(s);
    for (const e of bizInfo || []) if (e.name) set.add(e.name);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [suppliers, bizInfo]);

  const entryFor = (name) =>
    (bizInfo || []).find((e) => e.name === name) || blankEntry(name);

  const filteredNames = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return names;
    return names.filter((name) => {
      const e = entryFor(name);
      const hay = [name, e.companyName, e.bizNo, e.ceo, e.items, e.bizItem]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [names, query, bizInfo]);

  const update = (name, patch) => {
    const exists = (bizInfo || []).some((e) => e.name === name);
    const next = exists
      ? bizInfo.map((e) => (e.name === name ? { ...e, ...patch } : e))
      : [...(bizInfo || []), { ...blankEntry(name), ...patch }];
    onChange(next);
  };

  const removeEntry = (name) => {
    if (!confirm(`'${name}' 거래처 정보를 삭제하시겠습니까?`)) return;
    onChange((bizInfo || []).filter((e) => e.name !== name));
  };

  const addVendor = () => {
    const n = newName.trim();
    if (!n) return;
    if (!names.includes(n)) onChange([...(bizInfo || []), blankEntry(n)]);
    setNewName('');
    setQuery(n);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">🏢 거래처(매입처) 정보</div>
          <div className="card-subtitle">
            거래처의 사업자등록번호·상호·결제방식·취급품목 등을 등록합니다. (형식 유효성 자동 확인)
          </div>
        </div>
        <div className="filter-group">
          <input
            className="input"
            placeholder="거래처 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 160 }}
          />
          <input
            className="input"
            placeholder="거래처 추가 (예: 거풍푸드)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addVendor()}
            style={{ width: 180 }}
          />
          <button className="btn" onClick={addVendor}>+ 거래처 추가</button>
        </div>
      </div>

      {names.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>
          아직 등록된 거래처가 없습니다. 데이터를 불러오면 매입처가 자동으로 나타나며, 위에서 직접 추가할 수도 있습니다.
        </p>
      )}
      {names.length > 0 && filteredNames.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>'{query}' 검색 결과가 없습니다.</p>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {filteredNames.map((name) => {
          const e = entryFor(name);
          const bizNoDigits = String(e.bizNo || '').replace(/\D/g, '');
          const showValidity = bizNoDigits.length === 10;
          const valid = showValidity && isValidBizNo(e.bizNo);
          return (
            <div
              key={name}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 14,
                background: '#f8fafc'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12
                }}
              >
                <strong style={{ fontSize: 15, color: 'var(--text)' }}>{name}</strong>
                <button
                  className="btn danger"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => removeEntry(name)}
                >
                  삭제
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 10
                }}
              >
                {/* 사업자등록번호 */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>사업자등록번호</span>
                  <input
                    className="input"
                    placeholder="000-00-00000"
                    value={e.bizNo || ''}
                    onChange={(ev) => update(name, { bizNo: formatBizNo(ev.target.value) })}
                  />
                  {showValidity && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: valid ? 'var(--success)' : 'var(--danger)'
                      }}
                    >
                      {valid ? '✓ 유효한 형식' : '✕ 번호 형식이 올바르지 않습니다'}
                    </span>
                  )}
                </label>

                {/* 과세유형 */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>과세유형</span>
                  <select
                    className="select"
                    value={e.taxType || ''}
                    onChange={(ev) => update(name, { taxType: ev.target.value })}
                  >
                    <option value="">선택</option>
                    <option value="과세">과세</option>
                    <option value="면세">면세</option>
                    <option value="간이과세">간이과세</option>
                  </select>
                </label>

                {FIELDS.map((f) => (
                  <label
                    key={f.key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      gridColumn: f.wide ? '1 / -1' : undefined
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{f.label}</span>
                    <input
                      className="input"
                      placeholder={f.placeholder}
                      value={e[f.key] || ''}
                      onChange={(ev) => update(name, { [f.key]: ev.target.value })}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
