import React from 'react';

export default function FormatGuide() {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">📐 기존 엑셀 양식 호환</div>
          <div className="card-subtitle">
            현재 쓰고 계신 그로븐/YB 시트 양식을 그대로 업로드하면 인식됩니다. 한 행 = 한 주문.
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>주문일</th>
              <th>사업자</th>
              <th>매입처</th>
              <th>판매처</th>
              <th>제품명</th>
              <th>규격</th>
              <th>수량</th>
              <th>매출</th>
              <th>매입</th>
              <th>배송비</th>
              <th>수수료</th>
              <th>부가세</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2026-05-21</td>
              <td><strong>그로븐</strong></td>
              <td>일비</td>
              <td>쿠팡</td>
              <td>박대</td>
              <td className="muted text-xs">32cm 내외 10미</td>
              <td>1</td>
              <td className="num">27,900</td>
              <td className="num">11,000</td>
              <td className="num">4,500</td>
              <td className="num">3,348</td>
              <td className="num"><span className="badge green">0</span></td>
            </tr>
            <tr>
              <td>2026-05-21</td>
              <td><strong>그로븐</strong></td>
              <td>푸드앤</td>
              <td>쿠팡</td>
              <td>간고등어</td>
              <td className="muted text-xs">140g 13팩</td>
              <td>1</td>
              <td className="num">32,400</td>
              <td className="num">23,400</td>
              <td className="num">2,300</td>
              <td className="num">3,888</td>
              <td className="num">0</td>
            </tr>
            <tr>
              <td>2026-05-21</td>
              <td><strong>옐로우브릿지</strong></td>
              <td>도매꾹</td>
              <td>11번가</td>
              <td>안전단화</td>
              <td className="muted text-xs">270mm</td>
              <td>1</td>
              <td className="num">20,400</td>
              <td className="num">12,600</td>
              <td className="num">3,000</td>
              <td className="num">2,448</td>
              <td className="num"><span className="badge orange">1,854</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid-2">
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>✨ 자동 인식되는 컬럼</div>
          <div className="text-sm" style={{ lineHeight: 1.7 }}>
            <strong>필수</strong>: 주문일(주문일자) · 주문금액(매출) · 매입가(매입)<br/>
            <strong>선택</strong>: 사업자, 매입처, 판매처, 제품명, 규격, 수량, 배송비, 판매수수료, 부가세, 비고
          </div>
          <div className="muted text-xs" style={{ marginTop: 8 }}>
            * 시트 이름이 "그로븐", "YB", "디네트"면 사업자명 자동 인식. 헤더 행 위치도 자동 탐지.
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🤖 자동 단가 제안 기능</div>
          <div className="text-sm" style={{ lineHeight: 1.7 }}>
            <strong>입력 폼에서</strong> 제품·규격·판매처를 선택하면 이전 이력 기반으로:
            <ul style={{ marginLeft: 18, marginTop: 4 }}>
              <li>판매가 자동 제안 (동일 제품·규격·플랫폼 중앙값)</li>
              <li>매입가 자동 제안 (동일 매입처 기준)</li>
              <li>배송비 자동 제안</li>
              <li>수수료율 자동 계산 (플랫폼 이력 기반)</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 12.5 }}>
        <strong>⚠️ 플랫폼 단가 실시간 크롤링은 불가능합니다.</strong>
        <div style={{ marginTop: 4 }}>
          쿠팡/11번가/도매꾹 등 외부 사이트의 가격을 자동으로 가져오는 기능은 브라우저 보안 정책(CORS) + 플랫폼 차단 정책 때문에 정적 웹앱에서는 불가능합니다.
          단, <strong>이력 기반 자동 제안</strong>이 사실상 동일한 효과를 냅니다 — 같은 제품을 두 번째부터는 자동 채워집니다.
        </div>
      </div>
    </div>
  );
}
