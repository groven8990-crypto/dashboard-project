// Sample data generator for demo / first-run
import { toISODate } from '../utils/dateUtils.js';

const BUSINESSES = ['사업자A', '사업자B'];
const CHANNELS_A = ['스마트스토어', '쿠팡', '11번가', '자사몰'];
const CHANNELS_B = ['쿠팡', '스마트스토어', '카카오톡스토어'];

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
      const channels = biz === '사업자A' ? CHANNELS_A : CHANNELS_B;
      const bizScale = biz === '사업자A' ? 1.3 : 1.0;
      for (const ch of channels) {
        if (Math.random() < 0.15) continue;
        const revenue = Math.round(rand(150000, 800000) * weekendBoost * trend * bizScale);
        const cost = Math.round(revenue * rand(0.55, 0.68));
        const fee = Math.round(revenue * rand(0.08, 0.13));
        const ad = Math.round(revenue * rand(0.04, 0.09));
        const vat = Math.round(revenue * 0.0909);
        const labor = Math.round(revenue * rand(0.04, 0.08));
        rows.push({
          date: iso,
          business: biz,
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
