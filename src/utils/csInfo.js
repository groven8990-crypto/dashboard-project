// 송장번호·CS 관리 정보 - 주문 단위로 저장 (재업로드해도 유지되도록 별도 보관)
// 구조: { [orderKey]: { invoice, csStatus, csMemo } }

const CS_KEY = 'sales-dashboard:csinfo:v1';

export const CS_STATUSES = ['', '신규', '발송준비', '발송완료', '배송중', '배송완료', '교환', '반품', '취소', '완료'];

export function loadCsInfo() {
  try {
    const v = localStorage.getItem(CS_KEY);
    const parsed = v ? JSON.parse(v) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCsInfo(map) {
  try {
    localStorage.setItem(CS_KEY, JSON.stringify(map || {}));
  } catch (e) {
    console.warn('Storage unavailable', e);
  }
}

// 주문 행의 안정적 키 - 주문번호 우선, 없으면 내용 조합으로 생성
export function orderKey(row) {
  if (row.orderNo) return String(row.orderNo);
  return [row.date, row.recipient, row.phone, row.product].filter(Boolean).join('|');
}
