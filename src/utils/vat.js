// 부가세 계산 규칙 (입력 폼 / 일괄계산 공용)
// 부가세 = 매출부가세(주문금액÷11) − 매입부가세(매입계÷11)
// - 면세 사업자(매출 면세): 부가세 0
// - 매입 면세(농수산물 등): 매입부가세 0

// 농수산물 등 면세 매입처 추정 (매입부가세 0). 기본 추정값일 뿐 수정 가능.
export const SUPPLIER_VAT_EXEMPT = /농협|수협|영어조합|작목반|수산|농산|축협|축산|농원/;

export function guessPurchaseExempt(supplier) {
  return SUPPLIER_VAT_EXEMPT.test(String(supplier || ''));
}

// 한 주문 행의 부가세 계산. purchaseExempt가 null/undefined면 매입처로 자동 추정.
export function computeRowVat(row, purchaseExempt) {
  if (row.taxType === '면세') return 0;
  const salesVat = Math.round((row.revenue || 0) / 11);
  const pExempt = purchaseExempt == null ? guessPurchaseExempt(row.supplier) : purchaseExempt;
  const lineCost = (row.cost || 0) * (row.quantity || 1);
  const purchaseVat = pExempt ? 0 : Math.round(lineCost / 11);
  return salesVat - purchaseVat;
}
