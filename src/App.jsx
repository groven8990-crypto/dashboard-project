import React, { useEffect, useMemo, useState } from 'react';
import KPICards from './components/KPICards.jsx';
import PeriodFilter from './components/PeriodFilter.jsx';
import TrendChart from './components/TrendChart.jsx';
import MarginAnalysis from './components/MarginAnalysis.jsx';
import BusinessCompare from './components/BusinessCompare.jsx';
import DailyReport from './components/DailyReport.jsx';
import DataUploader from './components/DataUploader.jsx';
import ManualEntry from './components/ManualEntry.jsx';
import DayOverDay from './components/DayOverDay.jsx';
import FormatGuide from './components/FormatGuide.jsx';
import {
  aggregate,
  filterRows,
  getDateRange,
  getUniqueValues,
  groupByPeriod,
  previousPeriodRange
} from './utils/analytics.js';
import { todayISO } from './utils/dateUtils.js';

const STORAGE_KEY = 'sales-dashboard:rows:v1';
const PREFS_KEY = 'sales-dashboard:prefs:v1';

function loadStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

function loadPrefs() {
  try {
    const v = localStorage.getItem(PREFS_KEY);
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [rows, setRows] = useState(loadStored);
  const [tab, setTab] = useState('overview');
  const [granularity, setGranularity] = useState('day');
  const [range, setRange] = useState({ from: '', to: '' });
  const [selectedBusinesses, setSelectedBusinesses] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // Persist rows
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch (e) {
      console.warn('Storage full or unavailable', e);
    }
  }, [rows]);

  const dataRange = useMemo(() => getDateRange(rows), [rows]);
  const businesses = useMemo(() => getUniqueValues(rows, 'business'), [rows]);

  // Initialize default range from data
  useEffect(() => {
    if (!initialized && rows.length && dataRange.max) {
      const prefs = loadPrefs();
      if (prefs.range?.from && prefs.range?.to) {
        setRange(prefs.range);
      } else {
        setRange({ from: dataRange.min, to: dataRange.max });
      }
      if (prefs.granularity) setGranularity(prefs.granularity);
      setInitialized(true);
    }
  }, [rows, dataRange, initialized]);

  useEffect(() => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ range, granularity, selectedBusinesses })
    );
  }, [range, granularity, selectedBusinesses]);

  const filtered = useMemo(
    () =>
      filterRows(rows, {
        from: range.from,
        to: range.to,
        businesses: selectedBusinesses
      }),
    [rows, range, selectedBusinesses]
  );

  const currentAgg = useMemo(() => aggregate(filtered), [filtered]);

  const previousAgg = useMemo(() => {
    if (!range.from || !range.to) return null;
    const prev = previousPeriodRange(range.from, range.to);
    if (!prev) return null;
    const prevRows = filterRows(rows, {
      ...prev,
      businesses: selectedBusinesses
    });
    return aggregate(prevRows);
  }, [rows, range, selectedBusinesses]);

  const periodSeries = useMemo(
    () => groupByPeriod(filtered, granularity),
    [filtered, granularity]
  );

  const handleLoad = (newRows, opts = {}) => {
    if (opts.append) {
      setRows((prev) => [...prev, ...newRows]);
    } else {
      setRows(newRows);
    }
    if (newRows.length && !initialized) {
      const r = getDateRange(newRows);
      setRange({ from: r.min, to: r.max });
      setInitialized(true);
    }
  };

  const handleManualAdd = (row, editingIdx) => {
    if (editingIdx !== null && editingIdx !== undefined) {
      setRows((prev) => prev.map((r, i) => (i === editingIdx ? row : r)));
    } else {
      setRows((prev) => [...prev, row]);
    }
  };

  const handleManualDelete = (idx) => {
    if (!confirm('이 행을 삭제하시겠습니까?')) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClear = () => {
    if (!confirm('저장된 모든 데이터를 삭제하시겠습니까?')) return;
    setRows([]);
    setRange({ from: '', to: '' });
    setInitialized(false);
  };

  const hasData = rows.length > 0;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>매출·마진 대시보드</h1>
          <div className="subtitle">
            온라인판매 유통 · 2개 사업자 통합 관리 · 일/주/월/연 마진 분석
          </div>
        </div>
        <div className="header-actions">
          <span className="badge">{rows.length.toLocaleString()}건 보유</span>
          {dataRange.min && (
            <span className="badge purple">
              {dataRange.min} ~ {dataRange.max}
            </span>
          )}
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          📊 종합 대시보드
        </button>
        <button
          className={`tab ${tab === 'margin' ? 'active' : ''}`}
          onClick={() => setTab('margin')}
        >
          💰 마진 구조 분석
        </button>
        <button
          className={`tab ${tab === 'compare' ? 'active' : ''}`}
          onClick={() => setTab('compare')}
        >
          🏢 사업자·채널 비교
        </button>
        <button
          className={`tab ${tab === 'daily' ? 'active' : ''}`}
          onClick={() => setTab('daily')}
        >
          📋 일일 매출 보고
        </button>
        <button
          className={`tab ${tab === 'data' ? 'active' : ''}`}
          onClick={() => setTab('data')}
        >
          📥 데이터 관리
        </button>
      </nav>

      <main className="main">
        {!hasData && tab !== 'data' && (
          <div className="empty-state">
            <h2>데이터가 아직 없습니다</h2>
            <p>먼저 데이터를 불러오거나 샘플 데이터를 로드해주세요.</p>
            <button
              className="btn primary"
              style={{ marginTop: 12 }}
              onClick={() => setTab('data')}
            >
              데이터 관리로 이동 →
            </button>
          </div>
        )}

        {hasData && tab !== 'data' && tab !== 'daily' && (
          <PeriodFilter
            granularity={granularity}
            onGranularityChange={setGranularity}
            from={range.from}
            to={range.to}
            onRangeChange={setRange}
            dataRange={dataRange}
            businesses={businesses}
            selectedBusinesses={selectedBusinesses}
            onBusinessesChange={setSelectedBusinesses}
          />
        )}

        {hasData && tab === 'overview' && (
          <>
            <KPICards current={currentAgg} previous={previousAgg} />
            <DayOverDay rows={rows} dataRange={dataRange} />
            <TrendChart data={periodSeries} granularity={granularity} />
            <MarginAnalysis agg={currentAgg} />
          </>
        )}

        {hasData && tab === 'margin' && (
          <>
            <KPICards current={currentAgg} previous={previousAgg} />
            <MarginAnalysis agg={currentAgg} />
            <PeriodMarginTable data={periodSeries} granularity={granularity} />
          </>
        )}

        {hasData && tab === 'compare' && (
          <>
            <KPICards current={currentAgg} previous={previousAgg} />
            <BusinessCompare rows={filtered} />
          </>
        )}

        {hasData && tab === 'daily' && (
          <DailyReport rows={rows} dataRange={dataRange} />
        )}

        {tab === 'data' && (
          <>
            <DataUploader
              onLoad={handleLoad}
              currentRows={rows}
              onClear={handleClear}
            />
            <FormatGuide />
            <ManualEntry
              rows={rows}
              businesses={businesses.length ? businesses : ['그로븐', '옐로우브릿지']}
              onAdd={handleManualAdd}
              onDelete={handleManualDelete}
            />
          </>
        )}
      </main>
    </div>
  );
}

function PeriodMarginTable({ data, granularity }) {
  if (!data.length) return null;
  const totals = data.reduce(
    (s, d) => ({
      revenue: s.revenue + d.revenue,
      cost: s.cost + d.cost,
      labor: s.labor + d.labor,
      ad: s.ad + d.ad,
      fee: s.fee + d.fee,
      vat: s.vat + d.vat,
      margin: s.margin + d.margin
    }),
    { revenue: 0, cost: 0, labor: 0, ad: 0, fee: 0, vat: 0, margin: 0 }
  );
  const totalRate = totals.revenue ? (totals.margin / totals.revenue) * 100 : 0;

  const periodName =
    granularity === 'day'
      ? '일자'
      : granularity === 'week'
      ? '주차'
      : granularity === 'month'
      ? '월'
      : '연도';

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{periodName}별 마진 명세</div>
          <div className="card-subtitle">전 기간 마진 추이를 표로 확인</div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>{periodName}</th>
              <th>매출</th>
              <th>매입</th>
              <th>인건비</th>
              <th>광고비</th>
              <th>수수료</th>
              <th>부가세</th>
              <th>순마진</th>
              <th>마진율</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.period}>
                <td><strong>{d.period}</strong></td>
                <td className="num">{fmt(d.revenue)}</td>
                <td className="num">{fmt(d.cost)}</td>
                <td className="num">{fmt(d.labor)}</td>
                <td className="num">{fmt(d.ad)}</td>
                <td className="num">{fmt(d.fee)}</td>
                <td className="num">{fmt(d.vat)}</td>
                <td className={`num ${d.margin >= 0 ? 'pos' : 'neg'}`}>{fmt(d.margin)}</td>
                <td>{d.marginRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>합계</td>
              <td className="num">{fmt(totals.revenue)}</td>
              <td className="num">{fmt(totals.cost)}</td>
              <td className="num">{fmt(totals.labor)}</td>
              <td className="num">{fmt(totals.ad)}</td>
              <td className="num">{fmt(totals.fee)}</td>
              <td className="num">{fmt(totals.vat)}</td>
              <td className={`num ${totals.margin >= 0 ? 'pos' : 'neg'}`}>{fmt(totals.margin)}</td>
              <td>{totalRate.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function fmt(n) {
  return Math.round(n).toLocaleString('ko-KR');
}
