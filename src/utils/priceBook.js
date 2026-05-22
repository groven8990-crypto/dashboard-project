// 가격 이력(Price Book) - 과거 주문 데이터에서 자동 단가/수수료/배송비 추출

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// 가장 최근 N건의 값을 사용 (트렌드 반영)
function recentValues(rows, field, n = 10) {
  return rows
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n)
    .map((r) => r[field])
    .filter((v) => v > 0);
}

// 제품+규격+판매처(플랫폼)에 대한 추천 판매가
export function suggestPrice(rows, { product, spec, platform }) {
  if (!product) return null;
  // 1. 동일 product + spec + platform
  let matches = rows.filter(
    (r) =>
      r.product === product &&
      r.spec === spec &&
      r.platform === platform &&
      r.revenue > 0
  );
  let basis = 'product+spec+platform';
  // 2. fallback: product + spec
  if (matches.length === 0) {
    matches = rows.filter((r) => r.product === product && r.spec === spec && r.revenue > 0);
    basis = 'product+spec';
  }
  // 3. fallback: product + platform
  if (matches.length === 0) {
    matches = rows.filter(
      (r) => r.product === product && r.platform === platform && r.revenue > 0
    );
    basis = 'product+platform';
  }
  // 4. fallback: product only
  if (matches.length === 0) {
    matches = rows.filter((r) => r.product === product && r.revenue > 0);
    basis = 'product';
  }
  if (!matches.length) return null;
  const values = recentValues(matches, 'revenue', 10);
  if (!values.length) return null;
  return {
    value: Math.round(median(values)),
    samples: matches.length,
    basis
  };
}

// 제품+규격+매입처에 대한 추천 매입가
export function suggestCost(rows, { product, spec, supplier }) {
  if (!product) return null;
  let matches = rows.filter(
    (r) =>
      r.product === product &&
      r.spec === spec &&
      r.supplier === supplier &&
      r.cost > 0
  );
  let basis = 'product+spec+supplier';
  if (matches.length === 0) {
    matches = rows.filter((r) => r.product === product && r.spec === spec && r.cost > 0);
    basis = 'product+spec';
  }
  if (matches.length === 0) {
    matches = rows.filter(
      (r) => r.product === product && r.supplier === supplier && r.cost > 0
    );
    basis = 'product+supplier';
  }
  if (matches.length === 0) {
    matches = rows.filter((r) => r.product === product && r.cost > 0);
    basis = 'product';
  }
  if (!matches.length) return null;
  const values = recentValues(matches, 'cost', 10);
  if (!values.length) return null;
  return {
    value: Math.round(median(values)),
    samples: matches.length,
    basis
  };
}

// 판매처(플랫폼)별 수수료율 자동 산출
export function suggestFeeRate(rows, platform) {
  const matches = rows.filter((r) => r.platform === platform && r.revenue > 0 && r.fee > 0);
  if (matches.length < 3) {
    // 기본 수수료율 (업계 평균)
    const defaults = {
      쿠팡: 0.12,
      스마트스토어: 0.05,
      네이버: 0.05,
      '11번가': 0.13,
      지마켓: 0.12,
      옥션: 0.12,
      톡딜: 0.13,
      당근: 0.0
    };
    return { rate: defaults[platform] || null, samples: 0, basis: 'default' };
  }
  const rates = matches.map((r) => r.fee / r.revenue);
  return { rate: median(rates), samples: matches.length, basis: 'history' };
}

// 매입처별 평균 배송비
export function suggestShipping(rows, { supplier, product }) {
  let matches = rows.filter(
    (r) => r.supplier === supplier && r.product === product && r.shipping >= 0
  );
  if (matches.length === 0) {
    matches = rows.filter((r) => r.supplier === supplier && r.shipping >= 0);
  }
  if (matches.length === 0) return null;
  const values = matches.map((r) => r.shipping);
  return { value: Math.round(median(values)), samples: matches.length };
}

// 제품 카탈로그 - 등록된 모든 (제품, 규격) 조합과 통계
export function buildCatalog(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r.product) continue;
    const k = `${r.product}|${r.spec || ''}`;
    if (!map.has(k)) {
      map.set(k, {
        product: r.product,
        spec: r.spec || '',
        orders: 0,
        revenue: 0,
        cost: 0,
        suppliers: new Set(),
        platforms: new Set(),
        lastDate: '',
        prices: []
      });
    }
    const item = map.get(k);
    item.orders += 1;
    item.revenue += r.revenue || 0;
    item.cost += r.cost || 0;
    if (r.supplier) item.suppliers.add(r.supplier);
    if (r.platform) item.platforms.add(r.platform);
    if (r.date > item.lastDate) item.lastDate = r.date;
    if (r.revenue) item.prices.push(r.revenue);
  }
  return Array.from(map.values())
    .map((item) => ({
      ...item,
      suppliers: Array.from(item.suppliers),
      platforms: Array.from(item.platforms),
      avgPrice: item.prices.length ? Math.round(median(item.prices)) : 0,
      avgCost: item.orders ? Math.round(item.cost / item.orders) : 0
    }))
    .sort((a, b) => b.orders - a.orders);
}

// 제품명 자동완성 후보
export function getProductSuggestions(rows, query) {
  const set = new Set();
  for (const r of rows) {
    if (r.product) set.add(r.product);
  }
  const list = Array.from(set);
  if (!query) return list.slice(0, 50);
  const q = query.toLowerCase();
  return list.filter((p) => p.toLowerCase().includes(q)).slice(0, 50);
}

// 규격 자동완성 (특정 제품에 대한)
export function getSpecSuggestions(rows, product) {
  if (!product) return [];
  const set = new Set();
  for (const r of rows) {
    if (r.product === product && r.spec) set.add(r.spec);
  }
  return Array.from(set).sort();
}
