// 영업활동일지 저장소 (localStorage)
// 한 건의 활동 = { id, date, region, client, contact, phone, type, scheduleTime,
//                  details, result, nextAction, nextDate, note, createdAt }

const STORAGE_KEY = 'sales-dashboard:activities:v1';

export const ACTIVITY_TYPES = ['방문', '전화', '미팅', '온라인', '메일', '견적', '계약', '기타'];
export const RESULT_TYPES = ['진행중', '성공', '실패', '보류', '재방문필요'];

export function loadActivities() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    const arr = v ? JSON.parse(v) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveActivities(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  } catch (e) {
    console.warn('영업활동일지 저장 실패', e);
  }
}

export function newId() {
  return 'a_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

export function blankActivity(date) {
  return {
    id: newId(),
    date: date || new Date().toISOString().slice(0, 10),
    region: '',
    client: '',
    contact: '',
    phone: '',
    type: '방문',
    scheduleTime: '',
    details: '',
    result: '진행중',
    nextAction: '',
    nextDate: '',
    note: '',
    createdAt: new Date().toISOString()
  };
}

// CSV 내보내기용 직렬화
const CSV_HEADERS = [
  '날짜', '영업지역', '거래처', '담당자', '연락처',
  '활동유형', '일정/시간', '세부사항', '결과', '후속조치', '다음일정', '메모'
];

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function activitiesToCsv(list) {
  const lines = [CSV_HEADERS.join(',')];
  for (const a of list) {
    lines.push([
      a.date, a.region, a.client, a.contact, a.phone,
      a.type, a.scheduleTime, a.details, a.result,
      a.nextAction, a.nextDate, a.note
    ].map(csvEscape).join(','));
  }
  return '﻿' + lines.join('\n'); // BOM for Excel
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
