import React, { useEffect, useMemo, useState } from 'react';
import KPICards from './components/KPICards.jsx';
import PeriodFilter from './components/PeriodFilter.jsx';
import TrendChart from './components/TrendChart.jsx';
import MarginAnalysis from './components/MarginAnalysis.jsx';
import BusinessCompare from './components/BusinessCompare.jsx';
import DailyReport from './components/DailyReport.jsx';
import MonthlyReport from './components/MonthlyReport.jsx';
import DataUploader from './components/DataUploader.jsx';
import ManualEntry from './components/ManualEntry.jsx';
import DayOverDay from './components/DayOverDay.jsx';
import FormatGuide from './components/FormatGuide.jsx';
import ProductAnalysis from './components/ProductAnalysis.jsx';
import SupplierAnalysis from './components/SupplierAnalysis.jsx';
import SupplierLedger from './components/SupplierLedger.jsx';
import CsManager from './components/CsManager.jsx';
import CloudSync from './components/CloudSync.jsx';
import AdCostManager from './components/AdCostManager.jsx';
import BizInfoManager from './components/BizInfoManager.jsx';
import PriceTableManager from './components/PriceTableManager.jsx';
import { normalizeSupplier } from './utils/csvParser.js';
import { createSyncManager, getCloudConfig } from './utils/cloudSync.js';
import { loadAdCosts, saveAdCosts, applyAdCosts } from './utils/adCosts.js';
import { loadBizInfo, saveBizInfo } from './utils/bizInfo.js';
import { loadCsInfo, saveCsInfo } from './utils/csInfo.js';
import { loadPriceTable, savePriceTable, applyPriceTableToOrders } from './utils/priceTable.js';
import { computeRowVat } from './utils/vat.js';
import {
  aggregate,
  filterRows,
  getDateRange,
  getUniqueValues,
  groupByPeriod,
  previousPeriodRange
} from './utils/analytics.js';
import { todayISO } from './utils/dateUtils.js';

const STORAGE_KEY = 'sales-dashboard:rows:v2';
const PREFS_KEY = 'sales-dashboard:prefs:v2';

// 기존에 저장된 데이터의 거래처명도 표준명으로 통일 (푸드엔/푸드앤 등 병합)
function migrateSuppliers(rows) {
  return Array.isArray(rows)
    ? rows.map((r) => ({ ...r, supplier: normalizeSupplier(r.supplier) }))
    : [];
}

function loadStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? migrateSuppliers(JSON.parse(v)) : [];
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
  const [adCosts, setAdCosts] = useState(loadAdCosts);
  const [bizInfo, setBizInfo] = useState(loadBizInfo);
  const [csInfo, setCsInfo] = useState(loadCsInfo);
  const [priceTable, setPriceTable] = useState(loadPriceTable);
  const [tab, setTab] = useState('overview');
  const [dataView, setDataView] = useState('orders');
  const [reportView, setReportView] = useState('daily');
  // 분석/보고 기준일: 'dispatch'(발주일, 기본) | 'order'(주문일)
  const [dateBasis, setDateBasis] = useState(() => loadPrefs().dateBasis || 'dispatch');
  // 일괄/삭제 등 위험 작업 직전 스냅샷 (한 단계 되돌리기)
  const [undoSnapshot, setUndoSnapshot] = useState(null);
  const [granularity, setGranularity] = useState('day');
  const [range, setRange] = useState({ from: '', to: '' });
  const [selectedBusinesses, setSelectedBusinesses] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const syncManagerRef = React.useRef(null);
  const rowsRef = React.useRef(rows);
  const adCostsRef = React.useRef(adCosts);
  const bizInfoRef = React.useRef(bizInfo);
  const csInfoRef = React.useRef(csInfo);
  const priceTableRef = React.useRef(priceTable);
  React.useEffect(() => { rowsRef.current = rows; }, [rows]);
  React.useEffect(() => { adCostsRef.current = adCosts; }, [adCosts]);
  React.useEffect(() => { bizInfoRef.current = bizInfo; }, [bizInfo]);
  React.useEffect(() => { csInfoRef.current = csInfo; }, [csInfo]);
  React.useEffect(() => { priceTableRef.current = priceTable; }, [priceTable]);

  // 클라우드 동기화 매니저 초기화
  React.useEffect(() => {
    syncManagerRef.current = createSyncManager({
      getConfig: getCloudConfig,
      getData: () => ({
        rows: rowsRef.current,
        adCosts: adCostsRef.current,
        bizInfo: bizInfoRef.current,
        csInfo: csInfoRef.current,
        priceTable: priceTableRef.current
      }),
      onStatus: setSyncStatus
    });
  }, []);

  // rows/광고비/사업자정보/CS정보 변경 시 자동 업로드 (debounced 2초)
  React.useEffect(() => {
    if (!initialized) return;
    const cfg = getCloudConfig();
    if (cfg && cfg.gistId) {
      syncManagerRef.current?.scheduleSync();
    }
  }, [rows, adCosts, bizInfo, csInfo, priceTable, initialized]);

  // Persist rows
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch (e) {
      console.warn('Storage full or unavailable', e);
    }
  }, [rows]);

  // Persist 광고비
  useEffect(() => {
    saveAdCosts(adCosts);
  }, [adCosts]);

  // Persist 사업자 정보
  useEffect(() => {
    saveBizInfo(bizInfo);
  }, [bizInfo]);

  // Persist 송장·CS 정보
  useEffect(() => {
    saveCsInfo(csInfo);
  }, [csInfo]);

  // Persist 매입단가표
  useEffect(() => {
    savePriceTable(priceTable);
  }, [priceTable]);

  const handleCsChange = (key, patch) => {
    if (!key) return;
    setCsInfo((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));
  };

  // 월별 광고비를 일할계산 + 분석 기준일 적용한 분석용 행
  // 발주일 기준이면 발주일자가 있는 행은 발주일자를 분석 기준일(date)로 사용하고
  // 원래 주문일자는 orderDate로 보존한다. (주문 관리 목록은 원본 rows를 사용)
  const effectiveRows = useMemo(() => {
    const withAd = applyAdCosts(rows, adCosts);
    if (dateBasis === 'order') return withAd;
    return withAd.map((r) =>
      r.dispatchDate ? { ...r, orderDate: r.date, date: r.dispatchDate } : r
    );
  }, [rows, adCosts, dateBasis]);

  const dataRange = useMemo(() => getDateRange(effectiveRows), [effectiveRows]);
  const businesses = useMemo(() => getUniqueValues(rows, 'business'), [rows]);
  const suppliers = useMemo(() => getUniqueValues(rows, 'supplier'), [rows]);

  // 기준일 전환 시 기간 필터를 새 기준의 데이터 범위로 재설정 (최초 마운트는 건너뜀)
  const basisInitRef = React.useRef(false);
  useEffect(() => {
    if (!basisInitRef.current) { basisInitRef.current = true; return; }
    const base = dateBasis === 'order'
      ? rows
      : rows.map((r) => (r.dispatchDate ? { ...r, date: r.dispatchDate } : r));
    const rg = getDateRange(base);
    if (rg.min) setRange({ from: rg.min, to: rg.max });
  }, [dateBasis]);

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
      JSON.stringify({ range, granularity, selectedBusinesses, dateBasis })
    );
  }, [range, granularity, selectedBusinesses, dateBasis]);

  const filtered = useMemo(
    () =>
      filterRows(effectiveRows, {
        from: range.from,
        to: range.to,
        businesses: selectedBusinesses
      }),
    [effectiveRows, range, selectedBusinesses]
  );

  const currentAgg = useMemo(() => aggregate(filtered), [filtered]);

  const previousAgg = useMemo(() => {
    if (!range.from || !range.to) return null;
    const prev = previousPeriodRange(range.from, range.to);
    if (!prev) return null;
    const prevRows = filterRows(effectiveRows, {
      ...prev,
      businesses: selectedBusinesses
    });
    return aggregate(prevRows);
  }, [effectiveRows, range, selectedBusinesses]);

  const periodSeries = useMemo(
    () => groupByPeriod(filtered, granularity),
    [filtered, granularity]
  );

  const handleLoad = (newRows, opts = {}) => {
    if (opts.append) {
      setRows((prev) => [...prev, ...newRows]);
      if (newRows.length) {
        const r = getDateRange(newRows);
        // 추가된 주문의 날짜를 포함하도록 기간 필터 확장
        setRange((prev) => ({
          from: prev.from && prev.from < r.min ? prev.from : r.min,
          to: prev.to && prev.to > r.max ? prev.to : r.max
        }));
        setInitialized(true);
      }
    } else {
      setRows(newRows);
      if (newRows.length && !initialized) {
        const r = getDateRange(newRows);
        setRange({ from: r.min, to: r.max });
        setInitialized(true);
      }
    }
  };

  // 업로드 파일의 매입가·매입배송비만 기존 데이터에 덮어쓰기 (되돌리기 가능)
  const handleMergeUpdate = (mergedRows) => {
    setUndoSnapshot(rows);
    setRows(mergedRows);
  };

  // 단가표 기준으로 주문 매입가·매입배송비 채우기 (되돌리기 가능)
  const handleApplyPriceTable = () => {
    const res = applyPriceTableToOrders(rows, priceTable);
    if (res.updated > 0) {
      setUndoSnapshot(rows);
      setRows(res.rows);
    }
    return res;
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
    setUndoSnapshot(rows);
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // 선택한 주문들의 발주일자 일괄 수정
  const handleBulkSetDispatch = (indices, dispatchDate) => {
    const set = new Set(indices);
    setUndoSnapshot(rows);
    setRows((prev) => prev.map((r, i) => (set.has(i) ? { ...r, dispatchDate } : r)));
  };

  // 과세 건 부가세 자동 계산 (indices가 없으면 전체 과세 건)
  const handleAutoVat = (indices) => {
    const set = indices ? new Set(indices) : null;
    setUndoSnapshot(rows);
    setRows((prev) =>
      prev.map((r, i) => {
        if (set && !set.has(i)) return r;
        if (r.taxType !== '과세') return r;
        return { ...r, vat: computeRowVat(r) };
      })
    );
  };

  const handleUndo = () => {
    if (!undoSnapshot) return;
    setRows(undoSnapshot);
    setUndoSnapshot(null);
  };

  const handleClear = () => {
    if (!confirm('저장된 모든 데이터를 삭제하시겠습니까?')) return;
    setUndoSnapshot(rows);
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
            온라인판매 유통 · 사업자/채널/제품/매입처별 주문 분석 · 일/주/월/연 마진
          </div>
        </div>
        <div className="header-actions">
          {undoSnapshot && (
            <button
              className="btn"
              style={{ background: 'var(--warning-soft)', color: 'var(--warning)', fontWeight: 700 }}
              onClick={handleUndo}
              title="방금 일괄 변경/삭제를 되돌립니다"
            >
              ↶ 방금 작업 되돌리기
            </button>
          )}
          <span className="badge">{rows.length.toLocaleString()}건</span>
          {dataRange.min && (
            <span className="badge purple">
              {dataRange.min} ~ {dataRange.max}
            </span>
          )}
          <SyncBadge status={syncStatus} />
        </div>
      </header>

      <nav className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>📊 종합</button>
        <button className={`tab ${tab === 'margin' ? 'active' : ''}`} onClick={() => setTab('margin')}>💰 마진 구조</button>
        <button className={`tab ${tab === 'compare' ? 'active' : ''}`} onClick={() => setTab('compare')}>🏢 사업자·채널</button>
        <button className={`tab ${tab === 'product' ? 'active' : ''}`} onClick={() => setTab('product')}>📦 제품 분석</button>
        <button className={`tab ${tab === 'supplier' ? 'active' : ''}`} onClick={() => setTab('supplier')}>🏭 매입처 분석</button>
        <button className={`tab ${tab === 'ledger' ? 'active' : ''}`} onClick={() => setTab('ledger')}>🧾 거래처 정산</button>
        <button className={`tab ${tab === 'cs' ? 'active' : ''}`} onClick={() => setTab('cs')}>🎧 CS 관리</button>
        <button className={`tab ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>📋 매출 보고</button>
        <button className={`tab ${tab === 'data' ? 'active' : ''}`} onClick={() => setTab('data')}>📥 데이터 관리</button>
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

        {hasData && tab !== 'data' && tab !== 'daily' && tab !== 'cs' && (
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
            dateBasis={dateBasis}
            onDateBasisChange={setDateBasis}
          />
        )}

        {hasData && tab === 'overview' && (
          <>
            <KPICards current={currentAgg} previous={previousAgg} />
            <DayOverDay rows={effectiveRows} dataRange={dataRange} />
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

        {hasData && tab === 'product' && (
          <>
            <KPICards current={currentAgg} previous={previousAgg} />
            <ProductAnalysis rows={filtered} />
          </>
        )}

        {hasData && tab === 'supplier' && (
          <>
            <KPICards current={currentAgg} previous={previousAgg} />
            <SupplierAnalysis rows={filtered} />
          </>
        )}

        {hasData && tab === 'ledger' && (
          <SupplierLedger rows={filtered} />
        )}

        {hasData && tab === 'cs' && (
          <CsManager rows={rows} csInfo={csInfo} onCsChange={handleCsChange} />
        )}

        {hasData && tab === 'daily' && (
          <>
            <div className="toolbar no-print" style={{ marginBottom: 4 }}>
              <div className="filter-group">
                <button
                  className={`tab ${reportView === 'daily' ? 'active' : ''}`}
                  onClick={() => setReportView('daily')}
                >
                  📅 일일 보고
                </button>
                <button
                  className={`tab ${reportView === 'monthly' ? 'active' : ''}`}
                  onClick={() => setReportView('monthly')}
                >
                  🗓️ 월간 보고
                </button>
              </div>
            </div>
            {reportView === 'daily' ? (
              <DailyReport rows={effectiveRows} dataRange={dataRange} />
            ) : (
              <MonthlyReport rows={effectiveRows} dataRange={dataRange} />
            )}
          </>
        )}

        {tab === 'data' && (
          <>
            <div className="toolbar no-print" style={{ marginBottom: 8 }}>
              <div className="filter-group">
                <button className={`tab ${dataView === 'io' ? 'active' : ''}`} onClick={() => setDataView('io')}>📥 가져오기·내보내기·동기화</button>
                <button className={`tab ${dataView === 'orders' ? 'active' : ''}`} onClick={() => setDataView('orders')}>📋 주문 관리</button>
                <button className={`tab ${dataView === 'price' ? 'active' : ''}`} onClick={() => setDataView('price')}>💲 매입단가표</button>
                <button className={`tab ${dataView === 'biz' ? 'active' : ''}`} onClick={() => setDataView('biz')}>🏢 거래처 정보</button>
              </div>
            </div>

            {dataView === 'io' && (
              <>
                <DataUploader
                  onLoad={handleLoad}
                  onMergeUpdate={handleMergeUpdate}
                  currentRows={rows}
                  onClear={handleClear}
                />
                <CloudSync
                  rows={rows}
                  adCosts={adCosts}
                  bizInfo={bizInfo}
                  csInfo={csInfo}
                  priceTable={priceTable}
                  onPull={(pulledRows, newAdCosts, newBizInfo, newCsInfo, newPriceTable) => {
                    const newRows = migrateSuppliers(pulledRows);
                    setRows(newRows);
                    if (Array.isArray(newAdCosts)) setAdCosts(newAdCosts);
                    if (Array.isArray(newBizInfo)) setBizInfo(newBizInfo);
                    if (newCsInfo && typeof newCsInfo === 'object') setCsInfo(newCsInfo);
                    if (Array.isArray(newPriceTable)) setPriceTable(newPriceTable);
                    if (newRows.length) {
                      const r = getDateRange(newRows);
                      setRange({ from: r.min, to: r.max });
                      setInitialized(true);
                    }
                  }}
                />
                <AdCostManager rows={rows} adCosts={adCosts} onChange={setAdCosts} />
                <FormatGuide />
              </>
            )}

            {dataView === 'orders' && (
              <ManualEntry
                rows={rows}
                onAdd={handleManualAdd}
                onDelete={handleManualDelete}
                onBulkSetDispatch={handleBulkSetDispatch}
                onAutoVat={handleAutoVat}
              />
            )}

            {dataView === 'price' && (
              <PriceTableManager
                priceTable={priceTable}
                onChange={setPriceTable}
                onApplyToOrders={handleApplyPriceTable}
              />
            )}

            {dataView === 'biz' && (
              <BizInfoManager suppliers={suppliers} bizInfo={bizInfo} onChange={setBizInfo} />
            )}
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
      shipping: s.shipping + (d.shipping || 0),
      labor: s.labor + d.labor,
      ad: s.ad + d.ad,
      fee: s.fee + d.fee,
      vat: s.vat + d.vat,
      margin: s.margin + d.margin
    }),
    { revenue: 0, cost: 0, shipping: 0, labor: 0, ad: 0, fee: 0, vat: 0, margin: 0 }
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
              <th>배송비</th>
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
                <td className="num">{fmt(d.shipping || 0)}</td>
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
              <td className="num">{fmt(totals.shipping)}</td>
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

function SyncBadge({ status }) {
  if (!status) return null;
  const map = {
    syncing: { label: '☁ 동기화 중...', color: '#dbeafe', text: '#2563eb' },
    synced: { label: '☁ 동기화됨', color: '#dcfce7', text: '#16a34a' },
    error: { label: '☁ 동기화 실패', color: '#fee2e2', text: '#dc2626' }
  };
  const v = map[status.state];
  if (!v) return null;
  return (
    <span
      className="badge"
      style={{ background: v.color, color: v.text }}
      title={status.error || status.updatedAt || ''}
    >
      {v.label}
    </span>
  );
}
