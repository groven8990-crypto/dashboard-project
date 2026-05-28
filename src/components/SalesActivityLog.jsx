import React, { useEffect, useMemo, useState } from 'react';
import {
  loadActivities,
  saveActivities,
  blankActivity,
  ACTIVITY_TYPES,
  RESULT_TYPES,
  activitiesToCsv,
  downloadCsv,
  newId
} from '../utils/salesActivity.js';

const RESULT_COLOR = {
  '진행중': 'badge',
  '성공': 'badge green',
  '실패': 'badge',
  '보류': 'badge orange',
  '재방문필요': 'badge purple'
};

export default function SalesActivityLog() {
  const [items, setItems] = useState(() => loadActivities());
  const [form, setForm] = useState(() => blankActivity());
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState({ from: '', to: '', region: '', result: '', q: '' });

  // 변경 시 자동 저장
  useEffect(() => { saveActivities(items); }, [items]);

  const regions = useMemo(() => {
    const set = new Set();
    items.forEach((a) => { if (a.region) set.add(a.region); });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    return items
      .filter((a) => {
        if (filter.from && a.date < filter.from) return false;
        if (filter.to && a.date > filter.to) return false;
        if (filter.region && a.region !== filter.region) return false;
        if (filter.result && a.result !== filter.result) return false;
        if (q) {
          const hay = `${a.client} ${a.contact} ${a.details} ${a.nextAction} ${a.note} ${a.region}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.scheduleTime || '').localeCompare(a.scheduleTime || '');
      });
  }, [items, filter]);

  // 요약 통계
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const ymThis = today.slice(0, 7);
    const total = items.length;
    const todayCnt = items.filter((a) => a.date === today).length;
    const thisMonth = items.filter((a) => a.date.startsWith(ymThis)).length;
    const success = items.filter((a) => a.result === '성공').length;
    const inProgress = items.filter((a) => a.result === '진행중').length;
    const followUp = items.filter((a) => a.nextDate && a.nextDate >= today).length;
    return { total, todayCnt, thisMonth, success, inProgress, followUp };
  }, [items]);

  // 오늘 예정 (다음일정이 오늘인 항목)
  const todayFollowUps = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return items
      .filter((a) => a.nextDate === today)
      .sort((a, b) => (a.scheduleTime || '').localeCompare(b.scheduleTime || ''));
  }, [items]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.date) { alert('날짜를 입력해주세요.'); return; }
    if (!form.client.trim() && !form.region.trim() && !form.details.trim()) {
      alert('거래처·지역·세부사항 중 최소 하나는 입력해주세요.');
      return;
    }
    if (editingId) {
      setItems((prev) => prev.map((a) => (a.id === editingId ? { ...form, id: editingId } : a)));
      setEditingId(null);
    } else {
      setItems((prev) => [{ ...form, id: newId(), createdAt: new Date().toISOString() }, ...prev]);
    }
    setForm(blankActivity());
  };

  const handleEdit = (a) => {
    setForm({ ...a });
    setEditingId(a.id);
    // 폼이 화면 위에 있으므로 스크롤 상단으로
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(blankActivity());
  };

  const handleDelete = (id) => {
    if (!confirm('이 활동 기록을 삭제하시겠습니까?')) return;
    setItems((prev) => prev.filter((a) => a.id !== id));
    if (editingId === id) handleCancelEdit();
  };

  const handleDuplicate = (a) => {
    const copy = { ...a, id: newId(), date: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() };
    setItems((prev) => [copy, ...prev]);
  };

  const handleExport = () => {
    const csv = activitiesToCsv(filtered.length ? filtered : items);
    const ymd = new Date().toISOString().slice(0, 10);
    downloadCsv(`영업활동일지_${ymd}.csv`, csv);
  };

  const handleClearAll = () => {
    if (!confirm('모든 영업활동 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setItems([]);
  };

  return (
    <div>
      {/* 요약 KPI */}
      <div className="kpi-grid">
        <div className="kpi-card accent-blue">
          <div className="label">📒 전체 기록</div>
          <div className="value">{stats.total.toLocaleString()}건</div>
          <div className="sub">이번 달 {stats.thisMonth}건</div>
        </div>
        <div className="kpi-card accent-green">
          <div className="label">📅 오늘 활동</div>
          <div className="value">{stats.todayCnt}건</div>
          <div className="sub">진행중 {stats.inProgress}건</div>
        </div>
        <div className="kpi-card accent-purple">
          <div className="label">✅ 성공</div>
          <div className="value">{stats.success}건</div>
          <div className="sub">
            성공률 {stats.total ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0'}%
          </div>
        </div>
        <div className="kpi-card accent-orange">
          <div className="label">⏰ 예정 후속</div>
          <div className="value">{stats.followUp}건</div>
          <div className="sub">오늘 이후 다음일정</div>
        </div>
      </div>

      {/* 오늘 예정 알림 */}
      {todayFollowUps.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">🔔 오늘 예정된 후속 일정 ({todayFollowUps.length}건)</div>
              <div className="card-subtitle">다음일정이 오늘로 잡힌 활동입니다</div>
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {todayFollowUps.map((a) => (
              <li key={a.id} style={{ marginBottom: 4 }}>
                <strong>{a.client || '(거래처 미입력)'}</strong>
                {a.region && <span className="muted"> · {a.region}</span>}
                {' — '}
                <span>{a.nextAction || '후속조치 미기재'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 입력 폼 */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{editingId ? '✏️ 활동 수정' : '➕ 새 활동 기록'}</div>
            <div className="card-subtitle">날짜와 거래처·세부사항을 입력하고 저장하세요</div>
          </div>
          {editingId && (
            <button className="btn" onClick={handleCancelEdit}>취소</button>
          )}
        </div>

        <div className="form-grid">
          <Field label="날짜 *">
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => setField('date', e.target.value)}
            />
          </Field>
          <Field label="영업지역">
            <input
              className="input"
              list="region-list"
              placeholder="예: 서울 강남, 경기 수원"
              value={form.region}
              onChange={(e) => setField('region', e.target.value)}
            />
            <datalist id="region-list">
              {regions.map((r) => <option key={r} value={r} />)}
            </datalist>
          </Field>
          <Field label="거래처/고객명">
            <input
              className="input"
              placeholder="예: ㈜한국유통"
              value={form.client}
              onChange={(e) => setField('client', e.target.value)}
            />
          </Field>
          <Field label="담당자">
            <input
              className="input"
              placeholder="예: 김부장"
              value={form.contact}
              onChange={(e) => setField('contact', e.target.value)}
            />
          </Field>
          <Field label="연락처">
            <input
              className="input"
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
            />
          </Field>
          <Field label="활동유형">
            <select
              className="select"
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
            >
              {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="일정/시간">
            <input
              type="time"
              className="input"
              value={form.scheduleTime}
              onChange={(e) => setField('scheduleTime', e.target.value)}
            />
          </Field>
          <Field label="결과">
            <select
              className="select"
              value={form.result}
              onChange={(e) => setField('result', e.target.value)}
            >
              {RESULT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="다음 후속조치">
            <input
              className="input"
              placeholder="예: 견적서 재발송"
              value={form.nextAction}
              onChange={(e) => setField('nextAction', e.target.value)}
            />
          </Field>
          <Field label="다음 일정일">
            <input
              type="date"
              className="input"
              value={form.nextDate}
              onChange={(e) => setField('nextDate', e.target.value)}
            />
          </Field>

          <Field label="세부사항" full>
            <textarea
              className="input"
              rows={3}
              placeholder="상담 내용, 논의 사항, 고객 반응 등"
              value={form.details}
              onChange={(e) => setField('details', e.target.value)}
            />
          </Field>
          <Field label="메모" full>
            <textarea
              className="input"
              rows={2}
              placeholder="기타 참고사항"
              value={form.note}
              onChange={(e) => setField('note', e.target.value)}
            />
          </Field>
        </div>

        <div className="row" style={{ marginTop: 14, gap: 8 }}>
          <button className="btn primary" onClick={handleSave}>
            {editingId ? '수정 저장' : '저장'}
          </button>
          {!editingId && (
            <button className="btn" onClick={() => setForm(blankActivity())}>
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 필터 + 내보내기 */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">📋 활동 목록 ({filtered.length.toLocaleString()}건)</div>
            <div className="card-subtitle">필터·검색으로 좁혀보고 행을 클릭해 수정</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn" onClick={handleExport} title="CSV로 내보내기">
              📤 CSV 내보내기
            </button>
            <button className="btn danger" onClick={handleClearAll} title="전체 삭제">
              전체 삭제
            </button>
          </div>
        </div>

        <div className="filter-group" style={{ marginBottom: 12 }}>
          <label>기간</label>
          <input
            type="date"
            className="input"
            value={filter.from}
            onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value }))}
          />
          <span className="muted">~</span>
          <input
            type="date"
            className="input"
            value={filter.to}
            onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value }))}
          />
          <label>지역</label>
          <select
            className="select"
            value={filter.region}
            onChange={(e) => setFilter((f) => ({ ...f, region: e.target.value }))}
          >
            <option value="">전체</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label>결과</label>
          <select
            className="select"
            value={filter.result}
            onChange={(e) => setFilter((f) => ({ ...f, result: e.target.value }))}
          >
            <option value="">전체</option>
            {RESULT_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input
            className="input"
            placeholder="🔎 거래처·세부사항·메모 검색"
            value={filter.q}
            onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
            style={{ minWidth: 220 }}
          />
          {(filter.from || filter.to || filter.region || filter.result || filter.q) && (
            <button
              className="btn sm"
              onClick={() => setFilter({ from: '', to: '', region: '', result: '', q: '' })}
            >
              필터 초기화
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 10px' }}>
            <p className="muted">
              {items.length === 0
                ? '아직 기록된 영업활동이 없습니다. 위 폼에서 첫 활동을 등록해보세요.'
                : '필터 조건에 맞는 기록이 없습니다.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>날짜</th>
                  <th>시간</th>
                  <th>지역</th>
                  <th>거래처</th>
                  <th>담당자</th>
                  <th>유형</th>
                  <th>세부사항</th>
                  <th>결과</th>
                  <th>후속조치</th>
                  <th>다음일정</th>
                  <th style={{ width: 110 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => handleEdit(a)}>
                    <td style={{ textAlign: 'left' }}><strong>{a.date}</strong></td>
                    <td style={{ textAlign: 'left' }}>{a.scheduleTime || '-'}</td>
                    <td style={{ textAlign: 'left' }}>{a.region || '-'}</td>
                    <td style={{ textAlign: 'left' }}>{a.client || '-'}</td>
                    <td style={{ textAlign: 'left' }}>
                      {a.contact || '-'}
                      {a.phone && <div className="text-xs muted">{a.phone}</div>}
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      <span className="badge">{a.type}</span>
                    </td>
                    <td style={{ textAlign: 'left', maxWidth: 260 }}>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {a.details || '-'}
                      </div>
                      {a.note && (
                        <div className="text-xs muted" style={{ marginTop: 3 }}>📝 {a.note}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={RESULT_COLOR[a.result] || 'badge'}>{a.result}</span>
                    </td>
                    <td style={{ textAlign: 'left' }}>{a.nextAction || '-'}</td>
                    <td style={{ textAlign: 'left' }}>{a.nextDate || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn sm" onClick={() => handleEdit(a)}>수정</button>
                        <button className="btn sm" onClick={() => handleDuplicate(a)} title="오늘 날짜로 복제">복제</button>
                        <button className="btn sm danger" onClick={() => handleDelete(a.id)}>삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, full, children }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
