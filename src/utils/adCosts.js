// 월별 광고비 관리 + 일할계산
// 사용자는 월 단위로 광고비를 입력하고, 해당 월의 일수로 나눠
// 그 달 주문 행들에 자동 분배되어 마진 계산에 반영된다.

const AD_KEY = 'sales-dashboard:adcosts:v1';

export function loadAdCosts() {
  try {
    const v = localStorage.getItem(AD_KEY);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

export function saveAdCosts(list) {
  try {
    localStorage.setItem(AD_KEY, JSON.stringify(list || []));
  } catch (e) {
    console.warn('Storage unavailable', e);
  }
}

function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return 0;
  return new Date(y, m, 0).getDate();
}

// 월별 광고비를 일할 계산하여 각 주문 행의 ad에 더한 새 배열을 반환.
// - 그 달의 광고비 = amount, 일할 단가 = amount / 그달일수
// - 주문이 있는 날짜마다 일할 단가를 그 날 주문들에 균등 분배
// - business가 지정되면 해당 사업자 주문에만 분배 (없으면 전체)
export function applyAdCosts(rows, adEntries) {
  if (!adEntries || !adEntries.length) return rows;
  const out = rows.map((r) => ({ ...r }));
  for (const entry of adEntries) {
    const amount = Number(entry.amount) || 0;
    if (!amount || !entry.month) continue;
    const dim = daysInMonth(entry.month);
    if (!dim) continue;
    const dailyShare = amount / dim;
    const byDay = new Map();
    out.forEach((r, i) => {
      if ((r.date || '').slice(0, 7) !== entry.month) return;
      if (entry.business && r.business !== entry.business) return;
      if (!byDay.has(r.date)) byDay.set(r.date, []);
      byDay.get(r.date).push(i);
    });
    for (const idxs of byDay.values()) {
      const per = dailyShare / idxs.length;
      for (const i of idxs) out[i].ad = (out[i].ad || 0) + per;
    }
  }
  return out;
}

// 특정 월에 등록된 광고비 합계 (표시/검증용)
export function adTotalForMonth(adEntries, ym, business) {
  return (adEntries || [])
    .filter((e) => e.month === ym && (!business || !e.business || e.business === business))
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
}
