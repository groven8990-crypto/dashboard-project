import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parseDate, toISODate } from './dateUtils.js';

// 시트 이름 → 사업자 표준명 매핑
// 디네트 시트는 그로븐이 관리하는 B2B 채널이므로 사업자=그로븐으로 귀속
const SHEET_TO_BUSINESS = {
  '그로븐': '그로븐',
  'YB': '옐로우브릿지',
  '옐로우브릿지': '옐로우브릿지',
  '디네트': '그로븐',
  '그로스': '그로븐'
};

// 시트가 B2B 채널 등 특수 채널인 경우 platform을 강제 지정
const SHEET_TO_PLATFORM = {
  '디네트': '디네트(B2B)'
};

// 채널명 정규화 - 데이터에 섞여 있는 표기를 표준화
// B2B 업체로 들어온 매출은 (B2B) 표기로 통일하여 일반 플랫폼과 구분
const PLATFORM_NORMALIZE = {
  '구룡포황제과메기': '구룡포황제과메기(B2B)',
  'G마켓': '지마켓',
  'g마켓': '지마켓',
  '네이버': '스마트스토어'
};

function normalizePlatform(p) {
  const trimmed = (p || '').trim();
  if (!trimmed || trimmed === '-') return '기타';
  return PLATFORM_NORMALIZE[trimmed] || trimmed;
}

// 오픈마켓 통합 주문내역(원본) 양식에서 쓰는 셀러 계정(상호) → 사업자 매핑
const STORE_TO_BUSINESS = {
  '로또상회': '그로븐',
  '자꾸가게': '옐로우브릿지'
};

// "지마켓-로또상회" → { platform: '지마켓', store: '로또상회' }
function parseAccountAlias(alias) {
  const s = String(alias || '').trim();
  const idx = s.indexOf('-');
  if (idx === -1) return { platform: normalizePlatform(s), store: '' };
  return {
    platform: normalizePlatform(s.slice(0, idx).trim()),
    store: s.slice(idx + 1).trim()
  };
}

// "일비]박대/100g-10" → { supplier: '일비', product: '박대' }
// "도매꾹]63503778" → { supplier: '도매꾹', product: '' } (숫자코드는 제품명으로 안씀)
// "m202604077a8908c4d" → { supplier: '', product: '' }
function parseSellerCode(code) {
  const s = String(code || '').trim();
  const bi = s.indexOf(']');
  if (bi === -1) return { supplier: '', product: '' };
  const supplier = s.slice(0, bi).trim();
  let rest = s.slice(bi + 1).trim();
  const slash = rest.indexOf('/');
  if (slash >= 0) rest = rest.slice(0, slash).trim();
  const product = /^\d+$/.test(rest) ? '' : rest;
  return { supplier, product };
}

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

    // 디네트 시트처럼 platform을 강제 지정해야 하는 경우 (시트 단위 우선)
    const forcedPlatform = SHEET_TO_PLATFORM[sheetName];
    const rawPlatform = normalizePlatform(
      colMap.platform !== undefined ? String(r[colMap.platform] || '') : ''
    );

    const order = {
      date: toISODate(orderDate),
      dispatchDate: colMap.dispatchDate !== undefined
        ? (parseDate(r[colMap.dispatchDate]) ? toISODate(parseDate(r[colMap.dispatchDate])) : '')
        : '',
      business: business || '미지정',
      taxType: colMap.taxType !== undefined ? String(r[colMap.taxType] || '').trim() : '',
      supplier: colMap.supplier !== undefined ? String(r[colMap.supplier] || '').trim() : '',
      platform: forcedPlatform || rawPlatform,
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

// 오픈마켓 통합 주문내역(원본) 양식 여부 판별 + 헤더 행 탐색
function findRawHeaderRow(json) {
  for (let i = 0; i < Math.min(10, json.length); i++) {
    const row = (json[i] || []).map(normalizeHeader);
    if (row.includes('별칭(쇼핑몰계정)') && row.includes('총주문금액')) return i;
    if (row.includes('주문일시') && row.includes('총주문금액')) return i;
  }
  return -1;
}

// 오픈마켓 통합 주문내역(원본) 시트 파싱
function parseRawOrderSheet(json, headerIdx) {
  const headerRow = (json[headerIdx] || []).map(normalizeHeader);
  const idx = (name) => headerRow.indexOf(normalizeHeader(name));
  const c = {
    date: idx('주문일시'),
    alias: idx('별칭(쇼핑몰계정)'),
    productName: idx('상품명'),
    spec: idx('선택사항'),
    code: idx('판매자상품코드'),
    qty: idx('수량'),
    unit: idx('단가'),
    revenue: idx('총주문금액'),
    fee: idx('마켓수수료금액'),
    shipping: idx('배송비'),
    orderNo: idx('주문번호')
  };

  const rows = [];
  for (let i = headerIdx + 1; i < json.length; i++) {
    const r = json[i] || [];
    const orderDate = parseDate(c.date >= 0 ? r[c.date] : '');
    if (!orderDate) continue;

    const { platform, store } = parseAccountAlias(c.alias >= 0 ? r[c.alias] : '');
    const { supplier, product: codeProduct } = parseSellerCode(c.code >= 0 ? r[c.code] : '');
    const business = STORE_TO_BUSINESS[store] || store || '미지정';

    let product = codeProduct;
    if (!product) {
      product = String(c.productName >= 0 ? r[c.productName] : '').trim();
      if (store && product.startsWith(store)) product = product.slice(store.length).trim();
    }

    const qty = c.qty >= 0 ? parseNumber(r[c.qty]) || 1 : 1;
    const revenue =
      (c.revenue >= 0 ? parseNumber(r[c.revenue]) : 0) ||
      (c.unit >= 0 ? parseNumber(r[c.unit]) * qty : 0);

    const order = {
      date: toISODate(orderDate),
      dispatchDate: '',
      business,
      taxType: business === '그로븐' ? '면세' : business === '옐로우브릿지' ? '과세' : '',
      supplier,
      platform,
      product,
      spec: c.spec >= 0 ? String(r[c.spec] || '').trim() : '',
      quantity: qty,
      revenue,
      cost: 0,
      shipping: c.shipping >= 0 ? parseNumber(r[c.shipping]) : 0,
      fee: c.fee >= 0 ? parseNumber(r[c.fee]) : 0,
      vat: 0,
      labor: 0,
      ad: 0,
      orderNo: c.orderNo >= 0 ? String(r[c.orderNo] || '').trim() : '',
      note: ''
    };
    rows.push(order);
  }
  return rows;
}

export function parseExcelMultiSheet(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const allRows = [];
  const sheetInfo = [];
  const warnings = [];
  let format = 'summary';

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

    // 오픈마켓 통합 주문내역(원본) 양식 우선 판별
    const rawHeaderIdx = findRawHeaderRow(json);
    if (rawHeaderIdx !== -1) {
      const rawRows = parseRawOrderSheet(json, rawHeaderIdx);
      if (rawRows.length > 0) {
        format = 'raw';
        allRows.push(...rawRows);
        sheetInfo.push({ sheetName, business: '주문내역(원본)', count: rawRows.length });
      }
      continue;
    }

    // 보고용·요약·CS 시트는 건너뛰기 (헤더 탐지로 자동 필터되지만 명시적 제외도)
    if (/^sheet\d*$/i.test(sheetName) && sheetName !== 'Sheet1') continue;
    if (sheetName.includes('보고용')) continue;
    if (sheetName === 'CS리스트') continue;

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

  return { rows: allRows, sheetInfo, warnings, format };
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
