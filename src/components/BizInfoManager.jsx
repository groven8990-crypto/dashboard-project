import React, { useMemo, useState } from 'react';
import { formatBizNo, isValidBizNo } from '../utils/bizInfo.js';

const FIELDS = [
  { key: 'companyName', label: '정식 상호', placeholder: '예: (주)그로븐', wide: true },
  { key: 'ceo', label: '대표자명', placeholder: '예: 홍길동' },
  { key: 'bizType', label: '업태', placeholder: '예: 도소매' },
  { key: 'bizItem', label: '종목', placeholder: '예: 전자상거래' },
  { key: 'address', label: '사업장 주소', placeholder: '예: 서울시 ...', wide: true },
  { key: 'phone', label: '연락처', placeholder: '예: 010-0000-0000' }
];

const blankEntry = (business) => ({
  business,
  bizNo: '',
  companyName: '',
  ceo: '',
  taxType: business === '그로븐' ? '면세' : business === '옐로우브릿지' ? '과세' : '',
  bizType: '',
  bizItem: '',
  address: '',
  phone: '',
  note: ''
});

export default function BizInfoManager({ businesses, bizInfo, onChange }) {
  const [newName, setNewName] = useState('');

  // 데이터에 등장한 사업자 + 이미 등록된 사업자명 합치기
  const names = useMemo(() => {
    const set = new Set();
    for (const b of businesses || []) if (b) set.add(b);
    for (const e of bizInfo || []) if (e.business) set.add(e.business);
    return Array.from(set);
  }, [businesses, bizInfo]);

  const entryFor = (name) =>
    (bizInfo || []).find((e) => e.business === name) || blankEntry(name);

  const update = (name, patch) => {
    const exists = (bizInfo || []).some((e) => e.business === name);
    const next = exists
      ? bizInfo.map((e) => (e.business === name ? { ...e, ...patch } : e))
      : [...(bizInfo || []), { ...blankEntry(name), ...patch }];
    onChange(next);
  };

  const removeEntry = (name) => {
    if (!confirm(`'${name}' 사업자 정보를 삭제하시겠습니까?`)) return;
    onChange((bizInfo || []).filter((e) => e.business !== name));
  };

  const addBusiness = () => {
    const n = newName.trim();
    if (!n) return;
    if (!names.includes(n)) onChange([...(bizInfo || []), blankEntry(n)]);
    setNewName('');
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">🏢 사업자 정보 등록</div>
          <div className="card-subtitle">
            사업자등록번호·상호·대표자·과세유형 등을 등록합니다. (형식 유효성 자동 확인 · 서버 없이 저장)
          </div>
        </div>
        <div className="filter-group">
          <input
            className="input"
            placeholder="사업자 추가 (예: 그로븐)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBusiness()}
            style={{ width: 180 }}
          />
          <button className="btn" onClick={addBusiness}>+ 사업자 추가</button>
        </div>
      </div>

      {names.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>
          아직 등록된 사업자가 없습니다. 데이터를 불러오거나 위에서 사업자를 추가하세요.
        </p>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {names.map((name) => {
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
                background: 'var(--bg-soft, #fafafa)'
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
                <strong style={{ fontSize: 15 }}>{name}</strong>
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
                  <span style={{ fontSize: 12, fontWeight: 600 }}>사업자등록번호</span>
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
                  <span style={{ fontSize: 12, fontWeight: 600 }}>과세유형</span>
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
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</span>
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
