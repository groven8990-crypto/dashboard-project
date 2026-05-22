// Sample data generator for demo / first-run
import { toISODate } from '../utils/dateUtils.js';

// 그로븐 = 면세사업자 (부가세 0)
// 옐로우브릿지 = 과세사업자 (부가세 = 매출/11)
const BUSINESSES = [
  { name: '그로븐', taxType: '면세' },
  { name: '옐로우브릿지', taxType: '과세' }
];
const CHANNELS = ['스마트스토어', '쿠팡', '11번가', '지마켓', '옥션', '톡딜'];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export function generateSampleData(days = 180) {
  const rows = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = toISODate(d);
    const dayOfWeek = d.getDay();
    const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 1.2 : 1.0;
    const trend = 1 + (days - i) * 0.0015;

    for (const biz of BUSINESSES) {
      const bizScale = biz.name === '그로븐' ? 1.2 : 1.0;
      for (const ch of CHANNELS) {
        if (Math.random() < 0.2) continue;
        const revenue = Math.round(rand(150000, 800000) * weekendBoost * trend * bizScale);
        const cost = Math.round(revenue * rand(0.55, 0.68));
        const fee = Math.round(revenue * rand(0.08, 0.13));
        const ad = Math.round(revenue * rand(0.04, 0.09));
        // 면세사업자는 부가세 0, 과세사업자는 매출의 1/11 (VAT 별도가 아니라 매출 포함일 경우)
        const vat = biz.taxType === '면세' ? 0 : Math.round(revenue / 11);
        const labor = Math.round(revenue * rand(0.04, 0.08));
        rows.push({
          date: iso,
          business: biz.name,
          channel: ch,
          revenue,
          cost,
          labor,
          ad,
          fee,
          vat,
          note: ''
        });
      }
    }
  }
  return rows;
}
