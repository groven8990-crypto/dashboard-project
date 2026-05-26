import { getPeriodKey, parseDate, toISODate } from './dateUtils.js';

// 매입가는 단가, 매입 합계 = 매입가 × 수량
export function lineCost(row) {
  return (row.cost || 0) * (row.quantity || 1);
}

// 마진액 = 매출 − 매입(단가×수량) − 배송비 − 인건비 − 광고비 − 판매수수료 − 부가세
export function computeMargin(row) {
  const expenses =
    lineCost(row) +
    (row.shipping || 0) +
    (row.labor || 0) +
    (row.ad || 0) +
    (row.fee || 0) +
    (row.vat || 0);
  const margin = (row.revenue || 0) - expenses;
  const marginRate = row.revenue ? (margin / row.revenue) * 100 : 0;
  return { margin, marginRate, expenses };
}

export function aggregate(rows) {
  const agg = {
    revenue: 0,
    cost: 0,
    shipping: 0,
    labor: 0,
    ad: 0,
    fee: 0,
    vat: 0,
    quantity: 0,
    margin: 0,
    orderCount: rows.length
  };
  for (const r of rows) {
    agg.revenue += r.revenue || 0;
    agg.cost += lineCost(r);
    agg.shipping += r.shipping || 0;
    agg.labor += r.labor || 0;
    agg.ad += r.ad || 0;
    agg.fee += r.fee || 0;
    agg.vat += r.vat || 0;
    agg.quantity += r.quantity || 0;
  }
  agg.margin =
    agg.revenue - agg.cost - agg.shipping - agg.labor - agg.ad - agg.fee - agg.vat;
  agg.marginRate = agg.revenue ? (agg.margin / agg.revenue) * 100 : 0;
  agg.grossProfit = agg.revenue - agg.cost - agg.shipping;
  agg.grossRate = agg.revenue ? (agg.grossProfit / agg.revenue) * 100 : 0;
  agg.avgOrderValue = agg.orderCount ? agg.revenue / agg.orderCount : 0;
  return agg;
}

export function groupByPeriod(rows, granularity) {
  const groups = new Map();
  for (const r of rows) {
    const key = getPeriodKey(r.date, granularity);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const result = [];
  for (const [key, items] of groups) {
    const agg = aggregate(items);
    result.push({ period: key, ...agg });
  }
  result.sort((a, b) => a.period.localeCompare(b.period));
  return result;
}

function groupBy(rows, field, fallback = '미지정') {
  const groups = new Map();
  for (const r of rows) {
    const k = (r[field] || fallback).trim() || fallback;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  return Array.from(groups.entries())
    .map(([key, items]) => ({ key, ...aggregate(items) }))
    .sort((a, b) => b.revenue - a.revenue);
}

export const groupByBusiness = (rows) =>
  groupBy(rows, 'business').map((g) => ({ ...g, business: g.key }));
export const groupByChannel = (rows) =>
  groupBy(rows, 'platform', '기타').map((g) => ({ ...g, channel: g.key }));
export const groupByPlatform = (rows) =>
  groupBy(rows, 'platform', '기타').map((g) => ({ ...g, platform: g.key }));
export const groupBySupplier = (rows) =>
  groupBy(rows, 'supplier', '미지정').map((g) => ({ ...g, supplier: g.key }));
export const groupByProduct = (rows) =>
  groupBy(rows, 'product', '미지정').map((g) => ({ ...g, product: g.key }));

// 제품 + 규격 조합으로 그룹화
export function groupByProductSpec(rows) {
  const groups = new Map();
  for (const r of rows) {
    const k = `${r.product || '미지정'}|${r.spec || ''}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  return Array.from(groups.entries())
    .map(([key, items]) => {
      const [product, spec] = key.split('|');
      return { product, spec, ...aggregate(items) };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function filterRows(rows, opts = {}) {
  const { from, to, businesses, platforms, suppliers, products } = opts;
  return rows.filter((r) => {
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (businesses && businesses.length && !businesses.includes(r.business)) return false;
    if (platforms && platforms.length && !platforms.includes(r.platform)) return false;
    if (suppliers && suppliers.length && !suppliers.includes(r.supplier)) return false;
    if (products && products.length && !products.includes(r.product)) return false;
    return true;
  });
}

export function getDateRange(rows) {
  if (!rows.length) return { min: null, max: null };
  let min = rows[0].date;
  let max = rows[0].date;
  for (const r of rows) {
    if (r.date < min) min = r.date;
    if (r.date > max) max = r.date;
  }
  return { min, max };
}

export function getUniqueValues(rows, field) {
  const s = new Set();
  for (const r of rows) {
    const v = r[field];
    if (v) s.add(v);
  }
  return Array.from(s).sort();
}

export function previousPeriodRange(from, to) {
  const f = parseDate(from);
  const t = parseDate(to);
  if (!f || !t) return null;
  const days = Math.round((t - f) / 86400000) + 1;
  const prevTo = new Date(f);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: toISODate(prevFrom), to: toISODate(prevTo) };
}
