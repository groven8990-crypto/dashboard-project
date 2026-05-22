import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parseDate, toISODate } from './dateUtils.js';

// Korean header aliases → canonical field
const FIELD_ALIASES = {
  date: ['날짜', '일자', '거래일', '판매일', '주문일', 'date', '발생일'],
  business: ['사업자', '사업장', '법인', '거래처', '브랜드', '회사', 'business', 'entity'],
  channel: ['채널', '판매채널', '플랫폼', '쇼핑몰', 'channel'],
  revenue: ['매출', '매출액', '판매액', '주문금액', '결제금액', 'revenue', 'sales'],
  cost: ['매입', '매입액', '원가', '상품원가', '구매가', 'cost', 'cogs', '매입원가'],
  labor: ['인건비', '급여', '인력비', 'labor', 'payroll'],
  ad: ['광고비', '마케팅비', '광고', 'ad', 'advertising', 'marketing'],
  fee: ['판매수수료', '수수료', '플랫폼수수료', '쇼핑몰수수료', 'fee', 'commission'],
  vat: ['부가세', '부가가치세', '세금', 'vat', 'tax'],
  note: ['비고', '메모', '설명', 'note', 'memo']
};

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, '');
}

function buildHeaderMap(headers) {
  const map = {};
  const normalized = headers.map(normalizeHeader);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias.toLowerCase());
      if (idx >= 0) {
        map[field] = headers[idx];
        break;
      }
    }
  }
  return map;
}

function parseNumber(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[,₩\s원]/g, '').replace(/\((.+)\)/, '-$1');
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

export function normalizeRows(rawRows) {
  if (!rawRows.length) return { rows: [], headerMap: {}, warnings: ['데이터가 비어 있습니다.'] };
  const headers = Object.keys(rawRows[0]);
  const headerMap = buildHeaderMap(headers);
  const warnings = [];

  if (!headerMap.date) warnings.push('날짜 컬럼을 찾지 못했습니다. (예상: 날짜/일자/거래일)');
  if (!headerMap.revenue) warnings.push('매출 컬럼을 찾지 못했습니다. (예상: 매출/매출액/판매액)');

  const rows = [];
  for (const r of rawRows) {
    const d = parseDate(r[headerMap.date]);
    if (!d) continue;
    rows.push({
      date: toISODate(d),
      business: String(r[headerMap.business] || '미지정').trim() || '미지정',
      channel: String(r[headerMap.channel] || '').trim(),
      revenue: parseNumber(r[headerMap.revenue]),
      cost: parseNumber(r[headerMap.cost]),
      labor: parseNumber(r[headerMap.labor]),
      ad: parseNumber(r[headerMap.ad]),
      fee: parseNumber(r[headerMap.fee]),
      vat: parseNumber(r[headerMap.vat]),
      note: String(r[headerMap.note] || '').trim()
    });
  }
  return { rows, headerMap, warnings };
}

export function parseCSV(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  });
  return normalizeRows(result.data);
}

export function parseExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
  return normalizeRows(json);
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
      사업자: r.business,
      채널: r.channel,
      매출: r.revenue,
      매입: r.cost,
      인건비: r.labor,
      광고비: r.ad,
      판매수수료: r.fee,
      부가세: r.vat,
      비고: r.note
    }))
  );
  return '﻿' + csv; // BOM for Excel Korean
}
