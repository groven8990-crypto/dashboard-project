import React from 'react';

export default function FormatGuide() {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">📐 추천 입력 양식</div>
          <div className="card-subtitle">
            기존 양식을 갈아엎으실 거라면, 아래처럼 1행 1건(채널 단위) 구조를 권장합니다.
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>사업자</th>
              <th>채널</th>
              <th>매출</th>
              <th>매입</th>
              <th>인건비</th>
              <th>광고비</th>
              <th>판매수수료</th>
              <th>부가세</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2026-05-22</td>
              <td><strong>그로븐</strong></td>
              <td>스마트스토어</td>
              <td className="num">500,000</td>
              <td className="num">310,000</td>
              <td className="num">25,000</td>
              <td className="num">30,000</td>
              <td className="num">55,000</td>
              <td className="num"><span className="badge green">0</span></td>
              <td className="muted">면세</td>
            </tr>
            <tr>
              <td>2026-05-22</td>
              <td><strong>그로븐</strong></td>
              <td>쿠팡</td>
              <td className="num">350,000</td>
              <td className="num">215,000</td>
              <td className="num">18,000</td>
              <td className="num">25,000</td>
              <td className="num">38,000</td>
              <td className="num">0</td>
              <td></td>
            </tr>
            <tr>
              <td>2026-05-22</td>
              <td><strong>옐로우브릿지</strong></td>
              <td>스마트스토어</td>
              <td className="num">660,000</td>
              <td className="num">410,000</td>
              <td className="num">30,000</td>
              <td className="num">40,000</td>
              <td className="num">72,000</td>
              <td className="num"><span className="badge orange">60,000</span></td>
              <td className="muted">과세</td>
            </tr>
            <tr>
              <td>2026-05-22</td>
              <td><strong>옐로우브릿지</strong></td>
              <td>11번가</td>
              <td className="num">220,000</td>
              <td className="num">140,000</td>
              <td className="num">10,000</td>
              <td className="num">15,000</td>
              <td className="num">24,000</td>
              <td className="num">20,000</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid-2">
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>✅ 핵심 원칙 3가지</div>
          <ol style={{ paddingLeft: 18, lineHeight: 1.7, fontSize: 13 }}>
            <li>
              <strong>1행 = 1건의 거래/일별 채널 합계</strong><br/>
              <span className="muted">날짜 × 사업자 × 채널 조합으로 1행씩. 합계/소계는 절대 행에 섞지 마세요.</span>
            </li>
            <li>
              <strong>사업자명·채널명은 항상 동일하게</strong><br/>
              <span className="muted">"그로븐"과 "그로븐 면세"를 섞으면 다른 사업자로 인식됩니다. 자동완성 활용.</span>
            </li>
            <li>
              <strong>비용은 발생일 기준</strong><br/>
              <span className="muted">인건비처럼 월 단위면, 30일로 나눠 매일 분배하거나 월말 한 줄에만 적어도 OK.</span>
            </li>
          </ol>
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>💡 사업자별 입력 팁</div>
          <div style={{ background: 'var(--success-soft)', padding: 12, borderRadius: 8, marginBottom: 8 }}>
            <strong style={{ color: 'var(--success)' }}>🟢 그로븐 (면세사업자)</strong>
            <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: 12.5 }}>
              <li>부가세 컬럼은 <strong>항상 0</strong> (면세품목 매출이므로)</li>
              <li>매출 = 결제금액 그대로 입력</li>
            </ul>
          </div>
          <div style={{ background: 'var(--warning-soft)', padding: 12, borderRadius: 8 }}>
            <strong style={{ color: 'var(--warning)' }}>🟠 옐로우브릿지 (과세사업자)</strong>
            <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: 12.5 }}>
              <li>매출은 <strong>VAT 포함 금액</strong>으로 입력</li>
              <li>부가세 = <strong>매출 ÷ 11</strong> (예: 660,000 → 60,000)</li>
              <li>수기 입력 시 [자동] 버튼으로 자동 산출됨</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12.5 }}>
        <strong>📝 어떻게 시작하면 좋을까?</strong>
        <ol style={{ margin: '6px 0 0 18px', padding: 0, lineHeight: 1.7 }}>
          <li><strong>「📥 템플릿 다운로드」</strong>로 양식 받기 → 그로븐/옐로우브릿지 4행 예시가 들어있음</li>
          <li>매일 마감 후 그 날 데이터 한 줄씩 추가 (채널이 6개면 사업자별 채널 합계 → 한 사업자당 최대 6행)</li>
          <li>엑셀에서 저장 → 이 화면에서 드래그&드롭 업로드 (매일/주간/월간 누적 가능)</li>
          <li>또는 「데이터 직접 입력」 폼으로 한 건씩 추가 → localStorage에 자동 저장</li>
        </ol>
      </div>
    </div>
  );
}
