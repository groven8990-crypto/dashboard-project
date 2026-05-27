// 매입단가표(Price Table) - 업체별 매입 단가표를 사이트에서 관리
// 구조: 행 배열. 총매입가 = 단가 + 매입배송비 (자동계산)
import * as XLSX from 'xlsx';
import { normalizeSupplier } from './csvParser.js';

const PRICE_KEY = 'sales-dashboard:pricetable:v1';

export function loadPriceTable() {
  try {
    const v = localStorage.getItem(PRICE_KEY);
    const arr = v ? JSON.parse(v) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function savePriceTable(arr) {
  try {
    localStorage.setItem(PRICE_KEY, JSON.stringify(arr || []));
  } catch (e) {
    console.warn('Storage unavailable', e);
  }
}

let _idSeq = 0;
export function newRowId() {
  _idSeq += 1;
  return `pt_${Date.now().toString(36)}_${_idSeq}`;
}

export function emptyPriceRow() {
  return {
    id: newRowId(),
    code: '', taxType: '', supplier: '', product: '', spec1: '', spec2: '', origin: '',
    qty: '', unit: '', unitPrice: 0, inboundShip: 0,
    saleShip: '', salePrice: 0,
    priceNaver: 0, priceCoupang: 0, priceTokdeal: 0, price11st: 0, priceAuctionG: 0,
    courier: '', note: ''
  };
}

// 총매입가 = 단가 + 매입배송비
export function totalCost(r) {
  return (Number(r.unitPrice) || 0) + (Number(r.inboundShip) || 0);
}

function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[,₩\s원]/g, '');
  if (!s || s === '-') return 0;
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}
const txt = (v) => String(v ?? '').trim();
const normH = (h) => String(h || '').trim().toLowerCase().replace(/\s+/g, '');

// "업체별 매입 단가표"(판매가) 시트를 찾아 행으로 변환.
// 반환: { rows, sheetName } 또는 throw
export function parsePriceTableFromExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false, raw: false });
  for (const name of wb.SheetNames) {
    const json = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: false });
    // 헤더 행: 단가 + 총매입가 + 제품명 포함
    let hi = -1;
    for (let i = 0; i < Math.min(8, json.length); i++) {
      const row = (json[i] || []).map(normH);
      if (row.includes('단가') && row.includes('총매입가') && (row.includes('제품명') || row.includes('제품'))) { hi = i; break; }
    }
    if (hi === -1) continue;

    const hdr = (json[hi] || []).map(normH);
    const find = (...names) => { for (const n of names) { const i = hdr.indexOf(normH(n)); if (i >= 0) return i; } return -1; };
    const cUnit = find('단가');
    const cTotal = find('총매입가');
    // 배송비가 두 번 등장: 단가 뒤(매입배송비), 총매입가 뒤(판매배송비)
    const shipIdxs = hdr.map((h, i) => (h === '배송비' ? i : -1)).filter((i) => i >= 0);
    const cInShip = shipIdxs.find((i) => i > cUnit && (cTotal < 0 || i < cTotal));
    const cSaleShip = shipIdxs.find((i) => cTotal >= 0 && i > cTotal);

    const col = {
      code: find('코드'), taxType: find('과세여부', '과세'), supplier: find('업체', '매입처'),
      product: find('제품명', '제품'), spec1: find('규격1', '규격'), spec2: find('규격2'),
      origin: find('생산지'), qty: find('수량'), unit: find('단위'),
      salePrice: find('판매가'), naver: find('네이버'), coupang: find('쿠팡'),
      tokdeal: find('톡딜'), st11: find('11번가'), auctionG: find('옥션&g마켓', '옥션&지마켓', '옥션'),
      courier: find('택배사'), note: find('비고')
    };

    const rows = [];
    for (let i = hi + 1; i < json.length; i++) {
      const r = json[i] || [];
      const product = col.product >= 0 ? txt(r[col.product]) : '';
      const unitPrice = cUnit >= 0 ? num(r[cUnit]) : 0;
      // 제품명도 없고 단가도 없으면 빈 행으로 간주
      if (!product && !unitPrice) continue;
      rows.push({
        id: newRowId(),
        code: col.code >= 0 ? txt(r[col.code]) : '',
        taxType: col.taxType >= 0 ? txt(r[col.taxType]) : '',
        supplier: col.supplier >= 0 ? normalizeSupplier(r[col.supplier]) : '',
        product,
        spec1: col.spec1 >= 0 ? txt(r[col.spec1]) : '',
        spec2: col.spec2 >= 0 ? txt(r[col.spec2]) : '',
        origin: col.origin >= 0 ? txt(r[col.origin]) : '',
        qty: col.qty >= 0 ? txt(r[col.qty]) : '',
        unit: col.unit >= 0 ? txt(r[col.unit]) : '',
        unitPrice,
        inboundShip: cInShip != null ? num(r[cInShip]) : 0,
        saleShip: cSaleShip != null ? txt(r[cSaleShip]) : '',
        salePrice: col.salePrice >= 0 ? num(r[col.salePrice]) : 0,
        priceNaver: col.naver >= 0 ? num(r[col.naver]) : 0,
        priceCoupang: col.coupang >= 0 ? num(r[col.coupang]) : 0,
        priceTokdeal: col.tokdeal >= 0 ? num(r[col.tokdeal]) : 0,
        price11st: col.st11 >= 0 ? num(r[col.st11]) : 0,
        priceAuctionG: col.auctionG >= 0 ? num(r[col.auctionG]) : 0,
        courier: col.courier >= 0 ? txt(r[col.courier]) : '',
        note: col.note >= 0 ? txt(r[col.note]) : ''
      });
    }
    if (rows.length) return { rows, sheetName: name };
  }
  throw new Error('단가표 시트를 찾지 못했습니다. (코드·단가·총매입가·제품명 헤더가 있는 시트 필요)');
}

// 주문 한 건에 맞는 단가표 행을 찾아 매입가(단가)·매입배송비를 반환. 없으면 null.
// 매칭: 업체+제품 우선, 규격1/규격2/수량+단위로 가점. 동점이고 단가가 엇갈리면 보류(null).
export function matchOrderPrice(priceRows, order) {
  const prod = txt(order.product);
  if (!prod || !priceRows.length) return null;
  const sup = normalizeSupplier(order.supplier);

  let cands = priceRows.filter((p) => {
    const pp = txt(p.product);
    return pp && (pp === prod || prod.includes(pp) || pp.includes(prod));
  });
  if (!cands.length) return null;
  if (sup) {
    const bySup = cands.filter((p) => normalizeSupplier(p.supplier) === sup);
    if (bySup.length) cands = bySup;
  }

  const spec = txt(order.spec).replace(/\s+/g, '');
  const scored = cands.map((p) => {
    let score = 0;
    const s1 = txt(p.spec1).replace(/\s+/g, '');
    const s2 = txt(p.spec2).replace(/\s+/g, '');
    if (s1 && spec.includes(s1)) score += 2;
    if (s2 && spec.includes(s2)) score += 2;
    if (p.qty && p.unit && spec.includes(`${txt(p.qty)}${txt(p.unit)}`)) score += 3;
    return { p, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best.score === 0) {
    // 규격 단서가 없으면 후보가 유일할 때만 확정
    if (cands.length !== 1) return null;
  } else {
    // 동점 최상위들이 단가가 다르면 모호 → 보류
    const top = scored.filter((s) => s.score === best.score);
    const distinct = new Set(top.map((s) => Number(s.p.unitPrice) || 0));
    if (distinct.size > 1) return null;
  }
  return { unitPrice: Number(best.p.unitPrice) || 0, shipping: Number(best.p.inboundShip) || 0 };
}

// 단가표 기준으로 주문들의 매입가·매입배송비 채우기. 반환 { rows, updated, matched }
export function applyPriceTableToOrders(orders, priceRows) {
  let updated = 0, matched = 0;
  const rows = orders.map((o) => {
    const m = matchOrderPrice(priceRows, o);
    if (!m) return o;
    matched++;
    if ((o.cost || 0) === m.unitPrice && (o.shipping || 0) === m.shipping) return o;
    updated++;
    return { ...o, cost: m.unitPrice, shipping: m.shipping };
  });
  return { rows, updated, matched };
}
