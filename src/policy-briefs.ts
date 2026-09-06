import type { Bill } from "./politics";

// Editorial explanations of the submitted proposal, not personalised advice or
// a claim about the final enacted text. Match the exact bill, never its law name.
export type PolicyBrief = {
  id: string; number: string; title: string; date: string;
  headline: string; summary: string; audience: string;
  before: string; proposed: string; example: string; caution: string;
  reference: string; reviewedAt: string;
};
export const policyBriefs: PolicyBrief[] = [
  {
    id: "PRC_K2H6X0W6K1H6E1D1C4A5J5G5E7N9P7", number: "2221061",
    title: "주택법 일부개정법률안", date: "2026-09-03",
    headline: "아파트 건설계획에 노인 돌봄시설도 포함하자는 제안",
    summary: "새 주택단지를 계획할 때, 요양시설·주야간보호시설의 설치계획도 함께 마련하도록 바꾸려는 안입니다.",
    audience: "주택단지의 노인 돌봄시설을 이용하려는 어르신과 가족",
    before: "제안이유에 따르면 주택 건설사업계획에 노인요양시설·주야간보호시설의 설치계획을 반드시 포함하도록 하지는 않습니다.",
    proposed: "노인요양시설·주야간보호시설 등의 설치계획을 주택 건설사업계획에 포함하도록 합니다.",
    example: "부모님을 모실 돌봄시설이 단지 안에 생길 수 있을지 살펴볼 때 관련 있는 안입니다. 다만 설치계획을 다루는 것이지, 지금 사는 아파트에 시설이 생긴다는 뜻은 아닙니다.",
    caution: "모든 아파트에 시설을 의무 설치하거나 이용료를 지원하는 안으로 읽으면 안 됩니다. 실제 설치·이용 조건은 별도 확인이 필요합니다.",
    reference: "제안이유 및 주요내용 · 안 제15조제5항", reviewedAt: "2026-09-06",
  },
  {
    id: "PRC_Z2Z6X0Y8W2X4V1W3S4Q2R2P1Q1O9P8", number: "2221082",
    title: "소득세법 일부개정법률안", date: "2026-09-03",
    headline: "가족 소득 때문에 못 받던 기본공제, 대상 넓히자는 제안",
    summary: "배우자·부양가족의 기본공제 소득 기준을 연 100만원에서 300만원으로 높이려는 안입니다. 근로소득만 있다면 총급여 기준은 500만원에서 750만원으로 바뀝니다.",
    audience: "배우자·부양가족의 소득 때문에 기본공제를 받지 못하는 납세자",
    before: "배우자·부양가족의 연간 소득금액 합계가 100만원 이하여야 합니다. 근로소득만 있는 경우 총급여 500만원 이하가 기준입니다.",
    proposed: "소득금액 기준을 300만원 이하로, 근로소득만 있는 경우 총급여 기준을 750만원 이하로 완화합니다.",
    example: "가족에게 근로소득만 있고 연 총급여가 600만원이라면, 다른 공제 요건도 충족할 때 새 소득 기준에 들어갈 수 있습니다.",
    caution: "소득 기준 300만원은 돌려받는 세금이 아닙니다. 1명당 기본공제액 150만원을 올리는 안도 아닙니다. 나이·부양관계 등 다른 요건과 실제 세액은 별도로 확인해야 합니다.",
    reference: "제안이유 및 주요내용 · 안 제50조제1항제2호·제3호", reviewedAt: "2026-09-06",
  },
  {
    id: "PRC_Z2I5G0G1E0F6E1E1A2A6Z4X1Y5W5X6", number: "2221086",
    title: "장애인기업활동 촉진법 일부개정법률안", date: "2026-09-04",
    headline: "장애인기업 지원센터 대표, 장관이 임명하도록 바꾸자는 제안",
    summary: "지원금이나 창업 혜택을 늘리는 안이 아닙니다. 지원센터 대표를 누가, 어떤 절차로 뽑는지 바꾸려는 안입니다.",
    audience: "장애인기업 지원센터의 운영·책임 구조가 궁금한 이용자",
    before: "제안이유에 따르면 시행령상 한국장애경제인협회 회장이 지원센터 대표를 임명합니다.",
    proposed: "이사회의 추천을 거쳐 중소벤처기업부장관이 대표를 임명하도록 합니다.",
    example: "센터를 이용하는 장애인기업 입장에서는 운영 책임자를 뽑는 절차가 달라지는 사안입니다. 이 안만으로 받을 지원금이나 신청 자격이 달라진다고 볼 수는 없습니다.",
    caution: "공공기관 운영의 자율성·투명성을 높이려는 취지와, 실제 서비스가 좋아질지는 다른 문제입니다. 개선 효과는 아직 확인되지 않았습니다.",
    reference: "제안이유 및 주요내용 · 안 제13조제2항·제3항 신설 등", reviewedAt: "2026-09-06",
  },
  {
    id: "PRC_E2E6C0B8B2A1A0W9X3V2U0U4S6T9B2", number: "2221107",
    title: "국민건강보험법 일부개정법률안", date: "2026-09-04",
    headline: "가족이 떠안던 간병비, 건강보험에 포함하자는 제안",
    summary: "간병을 건강보험 급여 항목으로 명시하고, 주변에서 간병을 받기 어려운 사람부터 단계적으로 적용하려는 안입니다.",
    audience: "간병이 필요한 환자와 간병비를 부담하는 가족",
    before: "제안이유는 현행 요양급여 범위에 ‘간병’이 명시되지 않아 사적 간병비 부담이 크다는 점을 지적합니다.",
    proposed: "간병을 급여 항목에 포함하고, 차상위계층 등 취약계층의 본인일부부담금을 면제하되 재정 상황을 고려해 단계적으로 실시하도록 합니다.",
    example: "가족을 간병할 사람이 없어 유료 간병인을 이용하는 경우 살펴볼 만한 안입니다. 다만 지금 낸 간병비를 바로 환급받을 수 있다는 뜻은 아닙니다.",
    caution: "모든 간병비를 전액 지원한다는 안이 아닙니다. 구체적인 적용 대상·시기·본인부담액은 별도 확인이 필요합니다.",
    reference: "제안이유 및 주요내용 · 안 제41조 및 제44조의2 신설", reviewedAt: "2026-09-06",
  },
  {
    id: "PRC_Z2L6E0Q8A2T7V1W6Z3X7N3B3Z5M7D7", number: "2220987",
    title: "10·29이태원참사 피해자 권리보장과 진상규명 및 재발방지를 위한 특별법 일부개정법률안(대안)", date: "2026-09-01",
    headline: "이태원참사 진상조사, 활동기간을 1년 더 늘리는 안",
    summary: "특별조사위원회의 활동 종료일을 2026년 9월 16일에서 2027년 9월 16일로 연장하는 내용입니다.",
    audience: "참사 피해자·유가족과 진상조사 진행을 확인하려는 시민",
    before: "제안이유에 따르면 한 차례 3개월 연장된 조사위원회의 활동은 2026년 9월 16일 완료될 예정입니다.",
    proposed: "활동기간을 1년 연장해 2027년 9월 16일까지로 하고, 이미 사용한 3개월 연장 의결에 관한 단서 조항을 삭제합니다.",
    example: "조사가 끝나는 시점에 관한 변경입니다. 이 안만으로 새로운 피해보상 금액이나 지급일이 정해지는 것은 아닙니다.",
    caution: "아래는 제출된 대안의 설명입니다. 정부 이송과 법 시행은 다릅니다. 공포·시행일과 최종 조문은 별도 확인이 필요합니다.",
    reference: "대안의 제안이유·주요내용 · 안 제9조제1항 등", reviewedAt: "2026-09-06",
  },
  {
    id: "PRC_L2L6J0K2I2E6F1D0E1C4C1B4C4J0K2", number: "2217540",
    title: "국가정보원법 일부개정법률안", date: "2026-03-17",
    headline: "국가배후 해킹이 의심될 때도 국정원이 조사하는 안",
    summary: "제출안은 국가배후 해킹이 확정되기 전 의심되는 경우까지 정보 수집·조사 범위를 명확히 하고, 경제안보를 국정원 직무에 명시하려는 내용입니다.",
    audience: "해킹 피해 기업의 대응과 정보기관의 조사 범위가 궁금한 시민",
    before: "제안이유는 국가배후 해킹이 의심되지만 확인되지 않은 경우의 조사 권한이 구체적이지 않아 직무 범위 해석에 이견이 있다고 설명합니다.",
    proposed: "해킹수법·피해 양상상 국제·국가배후 조직이 의심되는 경우를 사이버안보 정보 범위에 포함하고 경제안보 직무를 명시합니다.",
    example: "민간기업 해킹 사고에서 국정원이 언제 관여할 수 있는지에 관한 안입니다. 피해자 보상금을 정하거나 모든 해킹을 막아준다는 내용은 아닙니다.",
    caution: "제출안 기준 설명이며 본회의 의결된 최종 조문과 같다는 뜻이 아닙니다. 실제 조사 권한의 요건·통제 장치·시행 여부는 최종 원문 확인이 필요합니다.",
    reference: "제안이유 및 주요내용 · 안 제4조제1항제1호나목·마목 등", reviewedAt: "2026-09-06",
  },
];

export function getPolicyBrief(bill: Bill): PolicyBrief | undefined {
  if (bill.mode !== "official") return undefined;
  return policyBriefs.find(b => b.id === bill.id && b.number === bill.number && b.title === bill.title && b.date === bill.date);
}
export function policyHeadline(bill: Bill) {
  return getPolicyBrief(bill)?.headline ?? "생활에 어떤 변화가 있는지 확인 중입니다";
}
export function proposalStatus(bill: Bill) {
  if (bill.mode === "demo") return "가상 시연 · 실제 정책 아님";
  if (["접수", "소관위접수", "위원회심사", "소관위심사"].includes(bill.stage)) return "제안 단계 · 확정 아님";
  return `${bill.stage} · 시행 여부 별도 확인`;
}
export function proposalSource(brief: PolicyBrief) {
  return `https://likms.assembly.go.kr/bill/billDetail.do?billId=${encodeURIComponent(brief.id)}`;
}
