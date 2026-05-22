// 샘플 주문 데이터 (실제 양식에 맞춰 1행 = 1주문)
import { toISODate } from '../utils/dateUtils.js';

const BUSINESSES = [
  { name: '그로븐', taxType: '면세' },
  { name: '옐로우브릿지', taxType: '과세' }
];

const PLATFORMS = ['스마트스토어', '쿠팡', '11번가', '지마켓', '옥션', '톡딜'];

const PRODUCTS = [
  { product: '박대', spec: '32cm 내외 10미', supplier: '일비', cost: 11000, price: 27900, shipping: 4500 },
  { product: '박대', spec: '32cm 내외 5미', supplier: '일비', cost: 6500, price: 16900, shipping: 4500 },
  { product: '간고등어', spec: '140g 13팩', supplier: '푸드앤', cost: 23400, price: 32400, shipping: 2300 },
  { product: '간고등어', spec: '100g 10팩', supplier: '푸드앤', cost: 13500, price: 19900, shipping: 2300 },
  { product: '영광굴비', spec: '1.5kg 내외 20미', supplier: '생선상륙', cost: 18500, price: 32500, shipping: 4000 },
  { product: '마른오징어', spec: '10미 (500g 내외)', supplier: '해담별', cost: 28800, price: 49900, shipping: 3000 },
  { product: '미나리', spec: '400g', supplier: '최고집', cost: 6900, price: 11900, shipping: 0 },
  { product: '수입포도', spec: '레드글로브 2kg', supplier: '해담별', cost: 16000, price: 22900, shipping: 0 },
  { product: '쑥개떡', spec: '1kg', supplier: '도매꾹', cost: 9500, price: 17900, shipping: 3000 },
  { product: '만다린', spec: '4kg', supplier: '해담별', cost: 18000, price: 28900, shipping: 3000 }
];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

const FEE_RATES = {
  쿠팡: 0.12,
  스마트스토어: 0.05,
  '11번가': 0.13,
  지마켓: 0.12,
  옥션: 0.12,
  톡딜: 0.13
};

export function generateSampleData(days = 90) {
  const rows = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = toISODate(d);
    const dayOfWeek = d.getDay();
    const ordersToday = Math.round(rand(8, 25) * (dayOfWeek === 0 || dayOfWeek === 6 ? 1.2 : 1.0));

    for (let k = 0; k < ordersToday; k++) {
      const biz = BUSINESSES[Math.floor(Math.random() * BUSINESSES.length)];
      const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
      const item = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
      const quantity = Math.random() < 0.85 ? 1 : Math.floor(rand(2, 5));
      const priceJitter = rand(0.95, 1.08);
      const revenue = Math.round(item.price * priceJitter);
      const cost = Math.round(item.cost * quantity);
      const shipping = item.shipping;
      const feeRate = FEE_RATES[platform] || 0.1;
      const fee = Math.round(revenue * feeRate);
      const vat = biz.taxType === '면세' ? 0 : Math.round(revenue / 11);

      rows.push({
        date: iso,
        dispatchDate: '',
        business: biz.name,
        taxType: biz.taxType,
        supplier: item.supplier,
        platform,
        product: item.product,
        spec: item.spec,
        quantity,
        revenue,
        cost,
        shipping,
        fee,
        vat,
        labor: 0,
        ad: 0,
        note: ''
      });
    }
  }
  return rows;
}
