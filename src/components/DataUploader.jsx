import React, { useRef, useState } from 'react';
import { parseFile, exportCSV } from '../utils/csvParser.js';
import { generateSampleData } from '../data/sampleData.js';

export default function DataUploader({ onLoad, currentRows, onClear }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(null);
  const [warnings, setWarnings] = useState([]);

  const handleFiles = async (files) => {
    if (!files || !files.length) return;
    try {
      setStatus({ type: 'info', msg: '파일 파싱 중...' });
      const { rows, warnings } = await parseFile(files[0]);
      if (!rows.length) {
        setStatus({ type: 'error', msg: '인식 가능한 데이터가 없습니다.' });
        return;
      }
      onLoad(rows, { append: false });
      setWarnings(warnings || []);
      setStatus({ type: 'success', msg: `${rows.length}건을 불러왔습니다.` });
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
          인식 컬럼: 날짜 · 사업자 · 채널 · 매출 · 매입 · 인건비 · 광고비 · 판매수수료 · 부가세
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
