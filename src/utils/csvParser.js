import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parseDate, toISODate } from './dateUtils.js';

// 시트 이름 → 사업자 표준명 매핑
const SHEET_TO_BUSINESS = {
  '그로븐': '그로븐',
  'YB': '옐로우브릿지',
  '옐로우브릿지': '옐로우브릿지',
  '디네트': '디네트',
  '그로스': '그로스'
};

// 헤더 별칭 → 표준 필드 매핑
const FIELD_ALIASES = {
  no: ['번호', 'no', 'idx'],
  taxType: ['과세', '과세구분', '면세과세'],
  supplier: ['매입처', '공급처', '거래처', '발주처'],
  orderDate: ['주문일', '주문일자', '판매일', '거래일', '일자', '날짜'],
  dispatchDate: ['발주일자', '발주일'],
  weekday: ['요일'],
  platform: ['판매처', '채널', '판매채널', '플랫폼', '쇼핑몰'],
  product: ['제품명', '상품명', '품목', '상품'],
  spec: ['규격', '옵션', '사이즈'],
  quantity: ['수량', 'qty'],
  recipient: ['수취인명', '수취인', '받는사람'],
  phone: ['휴대폰번호', '연락처', '전화번호'],
  address: ['주소', '배송지'],
  revenue: ['주문금액', '매출액', '매출', '판매액', '결제금액', '공급금액'],
  cost: ['매입가', '매입액', '원가', '구매가', '상품원가'],
  shipping: ['배송비', '3pl', '택배비'],
  total: ['합계', '총원가'],
  fee: ['판매수수료', '수수료', '플랫폼수수료'],
  vat: ['부가세', '부가가치세'],
  margin: ['마진액', '마진'],
  labor: ['인건비', '급여'],
  ad: ['광고비', '마케팅비'],
  note: ['비고', '메모', '설명'],
  business: ['사업자', '사업장', '브랜드', '회사']
};

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, '');
}

function buildHeaderMap(headerRow) {
  const map = {};
  const normalized = headerRow.map(normalizeHeader);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias.toLowerCase());
      if (idx >= 0) {
        map[field] = idx;
        break;
      }
    }
  }
  return map;
}

function parseNumber(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (!s || s === '-') return 0;
  const cleaned = s.replace(/[,₩\s원]/g, '').replace(/\((.+)\)/, '-$1');
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

// 헤더 행 자동 탐지 - "번호" + "제품명" 또는 "주문일" 등이 포함된 행을 찾음
function findHeaderRow(jsonRows) {
  for (let i = 0; i < Math.min(10, jsonRows.length); i++) {
    const row = (jsonRows[i] || []).map(normalizeHeader);
    const hasNo = row.includes('번호');
    const hasProduct = row.includes('제품명') || row.includes('상품명');
    const hasOrderDate = row.includes('주문일') || row.includes('주문일자');
    if (hasNo && (hasProduct || hasOrderDate)) return i;
  }
  return -1;
}

// 시트 첫 몇 행에서 상호명을 찾음 ("상호명: 그로븐" 등)
function detectBusinessFromContent(jsonRows, sheetName) {
  if (SHEET_TO_BUSINESS[sheetName]) return SHEET_TO_BUSINESS[sheetName];
  for (let i = 0; i < Math.min(5, jsonRows.length); i++) {
    for (const cell of jsonRows[i] || []) {
      const s = String(cell || '');
      const m = s.match(/상호명\s*[:：]\s*([^\s,]+)/);
      if (m) return m[1].trim();
    }
  }
  return sheetName;
}

function parseSheet(ws, sheetName) {
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  if (!json.length) return { rows: [], business: null };

  const headerIdx = findHeaderRow(json);
  if (headerIdx === -1) return { rows: [], business: null };

  const headerRow = json[headerIdx];
  const colMap = buildHeaderMap(headerRow);

  if (colMap.orderDate === undefined && colMap.dispatchDate === undefined) {
    return { rows: [], business: null };
  }
  if (colMap.revenue === undefined && colMap.cost === undefined) {
    return { rows: [], business: null };
  }

  const business = detectBusinessFromContent(json, sheetName);

  const rows = [];
  for (let i = headerIdx + 1; i < json.length; i++) {
    const r = json[i] || [];
    // 데이터 행 판별: 번호 컬럼이 숫자면 데이터
    const noVal = colMap.no !== undefined ? r[colMap.no] : null;
    if (!noVal && noVal !== 0) {
      // 번호 없으면 주문일이라도 있어야 함
      if (colMap.orderDate === undefined || !r[colMap.orderDate]) continue;
    }

    const orderDate =
      parseDate(r[colMap.orderDate]) ||
      parseDate(r[colMap.dispatchDate]);
    if (!orderDate) continue;

    const order = {
      date: toISODate(orderDate),
      dispatchDate: colMap.dispatchDate !== undefined
        ? (parseDate(r[colMap.dispatchDate]) ? toISODate(parseDate(r[colMap.dispatchDate])) : '')
        : '',
      business: business || '미지정',
      taxType: colMap.taxType !== undefined ? String(r[colMap.taxType] || '').trim() : '',
      supplier: colMap.supplier !== undefined ? String(r[colMap.supplier] || '').trim() : '',
      platform: colMap.platform !== undefined ? String(r[colMap.platform] || '').trim() : '',
      product: colMap.product !== undefined ? String(r[colMap.product] || '').trim() : '',
      spec: colMap.spec !== undefined ? String(r[colMap.spec] || '').trim() : '',
      quantity: colMap.quantity !== undefined ? parseNumber(r[colMap.quantity]) || 1 : 1,
      revenue: colMap.revenue !== undefined ? parseNumber(r[colMap.revenue]) : 0,
      cost: colMap.cost !== undefined ? parseNumber(r[colMap.cost]) : 0,
      shipping: colMap.shipping !== undefined ? parseNumber(r[colMap.shipping]) : 0,
      fee: colMap.fee !== undefined ? parseNumber(r[colMap.fee]) : 0,
      vat: colMap.vat !== undefined ? parseNumber(r[colMap.vat]) : 0,
      labor: colMap.labor !== undefined ? parseNumber(r[colMap.labor]) : 0,
      ad: colMap.ad !== undefined ? parseNumber(r[colMap.ad]) : 0,
      note: colMap.note !== undefined ? String(r[colMap.note] || '').trim() : ''
    };

    // 사업자별 면세/과세 자동 추론
    if (!order.taxType) {
      if (order.business === '그로븐') order.taxType = '면세';
      else if (order.business === '옐로우브릿지') order.taxType = '과세';
    }

    rows.push(order);
  }
  return { rows, business };
}

export function parseExcelMultiSheet(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const allRows = [];
  const sheetInfo = [];
  const warnings = [];

  for (const sheetName of wb.SheetNames) {
    // 보고용·요약·CS 시트는 건너뛰기 (헤더 탐지로 자동 필터되지만 명시적 제외도)
    if (/^sheet\d*$/i.test(sheetName) && sheetName !== 'Sheet1') continue;
    if (sheetName.includes('보고용')) continue;
    if (sheetName === 'CS리스트') continue;

    const ws = wb.Sheets[sheetName];
    const result = parseSheet(ws, sheetName);
    if (result.rows.length > 0) {
      allRows.push(...result.rows);
      sheetInfo.push({
        sheetName,
        business: result.business,
        count: result.rows.length
      });
    }
  }

  if (!allRows.length) {
    warnings.push('인식 가능한 데이터를 찾지 못했습니다. 시트의 헤더 구조를 확인해주세요.');
  }

  return { rows: allRows, sheetInfo, warnings };
}

// 단일 시트 / CSV 파싱 (구버전 호환)
function normalizeRowsLegacy(rawRows) {
  if (!rawRows.length) return { rows: [], warnings: ['데이터가 비어 있습니다.'] };
  const headers = Object.keys(rawRows[0]);
  const colMap = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const found = headers.find((h) => normalizeHeader(h) === alias.toLowerCase());
      if (found) {
        colMap[field] = found;
        break;
      }
    }
  }
  const warnings = [];
  if (!colMap.orderDate) warnings.push('주문일 컬럼을 찾지 못했습니다.');
  if (!colMap.revenue) warnings.push('주문금액(매출) 컬럼을 찾지 못했습니다.');

  const rows = [];
  for (const r of rawRows) {
    const d = parseDate(r[colMap.orderDate] || r[colMap.dispatchDate]);
    if (!d) continue;
    rows.push({
      date: toISODate(d),
      dispatchDate: colMap.dispatchDate && r[colMap.dispatchDate] ? (parseDate(r[colMap.dispatchDate]) ? toISODate(parseDate(r[colMap.dispatchDate])) : '') : '',
      business: String(r[colMap.business] || '미지정').trim() || '미지정',
      taxType: String(r[colMap.taxType] || '').trim(),
      supplier: String(r[colMap.supplier] || '').trim(),
      platform: String(r[colMap.platform] || '').trim(),
      product: String(r[colMap.product] || '').trim(),
      spec: String(r[colMap.spec] || '').trim(),
      quantity: parseNumber(r[colMap.quantity]) || 1,
      revenue: parseNumber(r[colMap.revenue]),
      cost: parseNumber(r[colMap.cost]),
      shipping: parseNumber(r[colMap.shipping]),
      fee: parseNumber(r[colMap.fee]),
      vat: parseNumber(r[colMap.vat]),
      labor: parseNumber(r[colMap.labor]),
      ad: parseNumber(r[colMap.ad]),
      note: String(r[colMap.note] || '').trim()
    });
  }
  return { rows, warnings };
}

export function parseCSV(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  });
  return normalizeRowsLegacy(result.data);
}

export function parseExcel(arrayBuffer) {
  return parseExcelMultiSheet(arrayBuffer);
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv' || ext === 'txt') {
    const text = await file.text();
    return parseCSV(text);
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer();
    return parseExcel(buf);
  }
  throw new Error('지원하지 않는 파일 형식입니다. (CSV/XLSX/XLS만 가능)');
}

export function exportCSV(rows) {
  const csv = Papa.unparse(
    rows.map((r) => ({
      날짜: r.date,
      발주일자: r.dispatchDate || '',
      사업자: r.business,
      과세: r.taxType,
      매입처: r.supplier,
      판매처: r.platform,
      제품명: r.product,
      규격: r.spec,
      수량: r.quantity,
      주문금액: r.revenue,
      매입가: r.cost,
      배송비: r.shipping,
      판매수수료: r.fee,
      부가세: r.vat,
      인건비: r.labor,
      광고비: r.ad,
      비고: r.note
    }))
  );
  return '﻿' + csv;
}
