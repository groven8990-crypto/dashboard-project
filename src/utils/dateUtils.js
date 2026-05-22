// Date parsing & period helpers (ISO yyyy-mm-dd as canonical)

function expandYear(y) {
  const n = Number(y);
  if (n < 100) return n < 70 ? 2000 + n : 1900 + n;
  return n;
}

export function parseDate(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input) ? null : input;
  const s = String(input).trim();
  if (!s) return null;

  // Excel serial number
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    const utcDays = serial - 25569;
    const ms = utcDays * 86400 * 1000;
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }

  // yyyymmdd
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  // yyyy-mm-dd, yyyy/mm/dd, yyyy.mm.dd (4-digit year)
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  // yy-m-d or yy/m/d or yy.m.d (2-digit year first, like 25-12-30, 26-1-21)
  m = s.match(/^(\d{2})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/);
  if (m) {
    const y = expandYear(m[1]);
    const month = +m[2];
    const day = +m[3];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(y, month - 1, day);
    }
  }

  // mm/dd/yyyy
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) return new Date(+m[3], +m[1] - 1, +m[2]);

  // mm/dd/yy or m/d/yy (US style with 2-digit year, like 12/30/25, 3/29/26)
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})(?!\d)/);
  if (m) {
    const month = +m[1];
    const day = +m[2];
    const y = expandYear(m[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(y, month - 1, day);
    }
  }

  const d = new Date(s);
  return isNaN(d) ? null : d;
}

export const toISODate = (d) => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fmtKDate = (d) => {
  if (!d) return '';
  const date = d instanceof Date ? d : parseDate(d);
  if (!date) return '';
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
};

export const fmtKDateShort = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}`;
};

// ISO week number (Mon-Sun)
export function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

export function getPeriodKey(isoDate, granularity) {
  const d = parseDate(isoDate);
  if (!d) return '';
  if (granularity === 'day') return toISODate(d);
  if (granularity === 'week') {
    const { year, week } = getISOWeek(d);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }
  if (granularity === 'month')
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (granularity === 'year') return String(d.getFullYear());
  return toISODate(d);
}

export function periodLabel(key, granularity) {
  if (!key) return '';
  if (granularity === 'day') {
    const [y, m, day] = key.split('-');
    return `${m}/${day}`;
  }
  if (granularity === 'week') {
    const [y, w] = key.split('-W');
    return `${y.slice(2)}년 ${parseInt(w, 10)}주`;
  }
  if (granularity === 'month') {
    const [y, m] = key.split('-');
    return `${y.slice(2)}년 ${parseInt(m, 10)}월`;
  }
  if (granularity === 'year') return `${key}년`;
  return key;
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDays(iso, days) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function startOfPeriod(iso, granularity) {
  const d = parseDate(iso);
  if (granularity === 'week') {
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
  } else if (granularity === 'month') {
    d.setDate(1);
  } else if (granularity === 'year') {
    d.setMonth(0, 1);
  }
  return toISODate(d);
}
