// 사업자 정보 관리 - 사업자(브랜드)별 등록번호/상호/대표자/과세유형 등 저장
// 서버 없이 브라우저(localStorage) + 클라우드 동기화에 함께 저장된다.

const BIZ_KEY = 'sales-dashboard:bizinfo:v1';

export function loadBizInfo() {
  try {
    const v = localStorage.getItem(BIZ_KEY);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

export function saveBizInfo(list) {
  try {
    localStorage.setItem(BIZ_KEY, JSON.stringify(list || []));
  } catch (e) {
    console.warn('Storage unavailable', e);
  }
}

// 입력값을 사업자등록번호 형식(123-45-67890)으로 자동 정리
export function formatBizNo(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

// 국세청 사업자등록번호 체크섬 검증 (형식·자릿수 유효성만, 휴폐업 여부는 별도)
export function isValidBizNo(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length !== 10) return false;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i], 10) * w[i];
  sum += Math.floor((parseInt(d[8], 10) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(d[9], 10);
}

export function getBizEntry(list, business) {
  return (list || []).find((e) => e.business === business) || null;
}
