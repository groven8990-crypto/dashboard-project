import React, { useRef, useState } from 'react';
import { parseFile, exportCSV } from '../utils/csvParser.js';
import { suggestCost } from '../utils/priceBook.js';
import { generateSampleData } from '../data/sampleData.js';

export default function DataUploader({ onLoad, currentRows, onClear }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleFiles = async (files) => {
    if (!files || !files.length) return;
    try {
      setStatus({ type: 'info', msg: '파일 파싱 중...' });
      const result = await parseFile(files[0]);
      const { rows, warnings, sheetInfo, format } = result;
      if (!rows.length) {
        setStatus({ type: 'error', msg: '인식 가능한 데이터가 없습니다.' });
        return;
      }

      // 오픈마켓 통합 주문내역(원본): 매입가 자동추정 후 기존 데이터에 추가
      if (format === 'raw') {
        let filled = 0;
        const withCost = rows.map((r) => {
          if (r.cost > 0 || !r.product || !(r.revenue > 0)) return r;
          const s = suggestCost(currentRows, {
            product: r.product,
            spec: r.spec,
            supplier: r.supplier
          });
          if (s && s.value > 0) {
            filled++;
            return { ...r, cost: s.value };
          }
          return r;
        });
        // 주문번호 기준 중복 제거 (같은 파일 재업로드 안전)
        const existing = new Set(currentRows.map((r) => r.orderNo).filter(Boolean));
        const deduped = withCost.filter((r) => !r.orderNo || !existing.has(r.orderNo));
        const dup = withCost.length - deduped.length;
        const noCost = deduped.filter((r) => !(r.cost > 0)).length;

        // 주문수집 파일의 발주일자 = 업로드 시 지정한 발주일자 (없으면 오늘)
        const dispatch = dispatchDate || new Date().toISOString().slice(0, 10);
        const dated = deduped.map((r) => ({ ...r, dispatchDate: r.dispatchDate || dispatch }));

        onLoad(dated, { append: true });
        const w = [...(warnings || [])];
        if (noCost > 0) {
          w.push(`매입가를 못 채운 ${noCost}건은 0원입니다. "주문 한 건 입력"의 수정 또는 과거 데이터 보강 후 다시 올려주세요.`);
        }
        setWarnings(w);
        const parts = [`${deduped.length}건 추가`];
        if (dup > 0) parts.push(`중복 ${dup}건 제외`);
        if (filled > 0) parts.push(`매입가 자동추정 ${filled}건`);
        setStatus({ type: 'success', msg: '📦 주문내역 원본 인식 — ' + parts.join(' · ') });
        return;
      }

      onLoad(rows, { append: false });
      setWarnings(warnings || []);
      const sheetMsg = sheetInfo && sheetInfo.length
        ? ' (' + sheetInfo.map((s) => `${s.business}: ${s.count}건`).join(', ') + ')'
        : '';
      setStatus({ type: 'success', msg: `총 ${rows.length}건 불러왔습니다.${sheetMsg}` });
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const loadSample = () => {
    const rows = generateSampleData(180);
    onLoad(rows, { append: false });
    setStatus({ type: 'success', msg: `샘플 데이터 ${rows.length}건을 로드했습니다.` });
    setWarnings([]);
  };

  const downloadTemplate = () => {
    const today = new Date().toISOString().slice(0, 10);
    const sample = [
      {
        date: today,
        business: '그로븐',
        channel: '스마트스토어',
        revenue: 500000,
        cost: 310000,
        labor: 25000,
        ad: 30000,
        fee: 55000,
        vat: 0,
        note: '면세사업자 - 부가세 0'
      },
      {
        date: today,
        business: '그로븐',
        channel: '쿠팡',
        revenue: 350000,
        cost: 215000,
        labor: 18000,
        ad: 25000,
        fee: 38000,
        vat: 0,
        note: ''
      },
      {
        date: today,
        business: '옐로우브릿지',
        channel: '스마트스토어',
        revenue: 660000,
        cost: 410000,
        labor: 30000,
        ad: 40000,
        fee: 72000,
        vat: 60000,
        note: '과세사업자 - 부가세 매출의 1/11'
      },
      {
        date: today,
        business: '옐로우브릿지',
        channel: '11번가',
        revenue: 220000,
        cost: 140000,
        labor: 10000,
        ad: 15000,
        fee: 24000,
        vat: 20000,
        note: ''
      }
    ];
    const csv = exportCSV(sample);
    downloadFile(csv, 'template_그로븐_옐로우브릿지.csv', 'text/csv;charset=utf-8;');
  };

  const downloadCurrent = () => {
    if (!currentRows.length) return;
    const csv = exportCSV(currentRows);
    downloadFile(csv, `sales_export_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">데이터 가져오기</div>
          <div className="card-subtitle">
            CSV 또는 엑셀(.xlsx) 파일을 업로드하면 자동 분석됩니다.
          </div>
        </div>
        <div className="filter-group">
          <button className="btn" onClick={downloadTemplate}>📥 템플릿 다운로드</button>
          <button className="btn" onClick={loadSample}>🧪 샘플 데이터 로드</button>
          {currentRows.length > 0 && (
            <>
              <button className="btn" onClick={downloadCurrent}>⬇️ 현재 데이터 내보내기</button>
              <button className="btn danger" onClick={onClear}>🗑️ 전체 삭제</button>
            </>
          )}
        </div>
      </div>

      <div className="filter-group" style={{ marginBottom: 12, alignItems: 'center' }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
          발주일자 (이번에 올리는 주문수집 파일에 적용)
        </label>
        <input
          type="date"
          className="input"
          value={dispatchDate}
          onChange={(e) => setDispatchDate(e.target.value)}
          style={{ width: 170 }}
        />
        <span className="text-xs muted">
          주문수집(원본) 파일을 올릴 때 이 날짜가 발주일자로 기록됩니다. (요약 파일은 파일의 발주일자 사용)
        </span>
      </div>

      <div
        className={`uploader ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{ cursor: 'pointer' }}
      >
        <h3>📂 파일을 끌어다 놓거나 클릭해서 선택하세요</h3>
        <p>CSV / XLSX / XLS · 한글 헤더 자동 인식</p>
        <p className="text-xs muted">
          요약본(사업자별 시트) 또는 오픈마켓 통합 주문내역(원본) 모두 자동 인식됩니다.
        </p>
        <p className="text-xs muted">
          원본 주문내역은 기존 데이터에 추가되며(중복 자동 제외), 매입가는 과거 이력으로 자동 추정됩니다.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {status && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 6,
            background:
              status.type === 'error'
                ? 'var(--danger-soft)'
                : status.type === 'success'
                ? 'var(--success-soft)'
                : 'var(--primary-soft)',
            color:
              status.type === 'error'
                ? 'var(--danger)'
                : status.type === 'success'
                ? 'var(--success)'
                : 'var(--primary)',
            fontSize: 13,
            fontWeight: 600
          }}
        >
          {status.msg}
        </div>
      )}

      {warnings.length > 0 && (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            borderRadius: 6,
            background: 'var(--warning-soft)',
            color: 'var(--warning)',
            fontSize: 12
          }}
        >
          <strong>경고:</strong>
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function downloadFile(content, name, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
