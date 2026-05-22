export const fmtKRW = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  const v = Math.round(Number(n));
  return v.toLocaleString('ko-KR') + '원';
};

export const fmtNum = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return Math.round(Number(n)).toLocaleString('ko-KR');
};

export const fmtPct = (n, digits = 1) => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return Number(n).toFixed(digits) + '%';
};

export const fmtKRWShort = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  const v = Number(n);
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 100000000) return sign + (abs / 100000000).toFixed(1) + '억';
  if (abs >= 10000) return sign + (abs / 10000).toFixed(0) + '만';
  return sign + Math.round(abs).toLocaleString('ko-KR');
};

export const fmtDelta = (curr, prev) => {
  if (!prev || prev === 0) return null;
  const diff = ((curr - prev) / Math.abs(prev)) * 100;
  return { value: diff, label: (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%' };
};
