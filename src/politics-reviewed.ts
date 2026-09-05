import type { Dataset } from "./politics";

// Editorial review of public primary records. This is not generated from headlines.
export const reviewedBillId = "PRC_L2L6J0K2I2E6F1D0E1C4C1B4C4J0K2";
const billUrl = `https://likms.assembly.go.kr/bill/billDetail.do?billId=${reviewedBillId}`;
export const minutesUrl =
  "https://record.assembly.go.kr/assembly/viewer/minutes/xml.do?id=57227&type=view";
export const reportUrl =
  "https://likms.assembly.go.kr/filegate/servlet/FileGate?bookId=561C3355-26F5-EF3C-479E-74F6AAF8B537&type=1";
const checked = "2026-09-06T01:24:27+09:00";
const api = "https://open.assembly.go.kr/portal/openapi/";
const title = "국가정보원법 일부개정법률안";
export const reviewed: Dataset = {
  version: 1,
  recordedAt: checked,
  status: "partial",
  scope:
    "의안 2217540의 공식 원문 수동 검토 사례. 전체 경력·정당·표결 명단 분석이 아닙니다. 회의록은 임시회의록이며 정정될 수 있습니다.",
  sources: [
    {
      id: "review-bill",
      service: "ALLBILLV2",
      url: `${api}ALLBILLV2?Type=json&pSize=5&ERACO=%EC%A0%9C22%EB%8C%80&BILL_NO=2217540`,
      recordedAt: checked,
      returned: 1,
      total: 1,
      complete: true,
    },
    {
      id: "review-sponsors",
      service: "BILLINFOPPSR",
      url: `${api}BILLINFOPPSR?Type=json&pSize=5&BILL_ID=${reviewedBillId}`,
      recordedAt: checked,
      returned: 5,
      total: 12,
      complete: false,
    },
    {
      id: "review-totals",
      service: "ncocpgfiaoituanbr",
      url: `${api}ncocpgfiaoituanbr?Type=json&pSize=5&AGE=22&BILL_NO=2217540`,
      recordedAt: checked,
      returned: 1,
      total: 1,
      complete: true,
    },
    {
      id: "review-minutes",
      service: "국회 임시회의록 · 본회의 17항",
      url: minutesUrl,
      recordedAt: checked,
      returned: 1,
      total: 1,
      complete: true,
      note: "제439회 제2차 본회의(2026-09-03), 국가정보원법 안건의 설명·반대토론 및 전자투표 명단을 검토. 발언 2건과 개인 표결 3건만 발췌 연결했습니다.",
    },
    {
      id: "review-report",
      service: "정보위원회 심사보고서",
      url: reportUrl,
      recordedAt: checked,
      returned: 1,
      total: 1,
      complete: true,
      note: "2026년 8월 심사보고서, 제안설명 요지와 수정 의결안. PDF 19~21쪽(인쇄면 23·25·26)의 조문·부칙을 확인했습니다.",
    },
    ...[
      ["VZA76236", "박선원"],
      ["WXJ8352N", "이성권"],
      ["3TP65086", "윤종오"],
    ].map(([id]) => ({
      id: `review-person-${id}`,
      service: "ALLNAMEMBER",
      url: `${api}ALLNAMEMBER?Type=json&pSize=5&NAAS_CD=${id}`,
      recordedAt: checked,
      returned: 1,
      total: 1,
      complete: true,
    })),
  ],
  people: [
    {
      id: "VZA76236",
      name: "박선원",
      party: "더불어민주당",
      region: "인천 부평구을",
      committee: "소속 위원회 조회값: 국방위원회, 정보위원회",
      mode: "official",
      categories: ["safety"],
      sourceId: "review-person-VZA76236",
      sourceUrl: `${api}ALLNAMEMBER?Type=json&pSize=5&NAAS_CD=VZA76236`,
    },
    {
      id: "WXJ8352N",
      name: "이성권",
      party: "국민의힘 · 이 의안 발의 당시",
      region: "부산 사하구갑 · 제22대",
      committee: "소속 위원회 조회값: 농림축산식품해양수산위원회",
      mode: "official",
      categories: ["safety"],
      sourceId: "review-person-WXJ8352N",
      sourceUrl: `${api}ALLNAMEMBER?Type=json&pSize=5&NAAS_CD=WXJ8352N`,
    },
    {
      id: "3TP65086",
      name: "윤종오",
      party: "진보당 · 2026-09-03 발언 기준",
      region: "울산 북구",
      committee: "소속 위원회 조회값: 국토교통위원회, 국회운영위원회",
      mode: "official",
      categories: ["safety"],
      sourceId: "review-person-3TP65086",
      sourceUrl: `${api}ALLNAMEMBER?Type=json&pSize=5&NAAS_CD=3TP65086`,
    },
  ],
  bills: [
    {
      id: reviewedBillId,
      number: "2217540",
      title,
      category: "safety",
      proposer: "이성권·박선원 의원 등 12인",
      stage: "본회의 수정가결 · 공포 미확인",
      date: "2026-03-17",
      mode: "official",
      sourceId: "review-bill",
      sourceUrl: billUrl,
      committee: "정보위원회",
      sponsorsTotal: 12,
      sponsorsReturned: 2,
      vote: {
        yes: 195,
        no: 17,
        abstain: 40,
        voted: 252,
        members: 299,
        date: "2026-09-03",
        sourceId: "review-totals",
        rowsTotal: 252,
        rowsReturned: 3,
        rowNote:
          "임시회의록의 투표자 252명 중 이 사례의 3명만 연결했습니다. 전체 명단이나 정당별 분포가 아닙니다. 표결 당시 정당이 별도로 확인되지 않은 경우 미확인으로 표시합니다.",
      },
    },
  ],
  records: [
    ...["VZA76236", "WXJ8352N"].map((personId) => ({
      id: `review-proposal-${personId}`,
      personId,
      billId: reviewedBillId,
      kind: "대표발의",
      date: "2026-03-17",
      title,
      detail:
        "제안자 API에서 두 의원 모두 대표발의로 등록되어 있습니다. 일반 공동발의와 구분합니다.",
      sourceId: "review-sponsors",
      sourceUrl: billUrl,
      mode: "official" as const,
    })),
    {
      id: "review-speech-park",
      personId: "VZA76236",
      billId: reviewedBillId,
      kind: "발언",
      date: "2026-09-03",
      title: "공동 대표발의안의 본회의 심사보고",
      detail:
        "박선원 의원은 정보위원장대리로 경제안보 직무 명시와 국제·국가배후 해킹조직의 활동으로 의심되는 경우를 포함하는 취지를 설명하고 의결을 요청했습니다. 위원회 보고 역할과 개인의 독자적 의도는 구분해야 합니다.",
      sourceId: "review-minutes",
      sourceUrl: minutesUrl,
      mode: "official",
    },
    {
      id: "review-speech-yoon",
      personId: "3TP65086",
      billId: reviewedBillId,
      kind: "발언",
      date: "2026-09-03",
      title: "직무 확대보다 민주적 통제를 요구한 반대토론",
      detail:
        "윤종오 의원은 경제안보·사이버 정보수집 범위가 넓어질 때 민간인 사찰로 이어질 수 있다는 우려를 제기하고, 권한 확대보다 민주적 통제 방안이 우선이라고 주장했습니다. 우려가 실제로 발생했다는 사실 판정이 아닙니다.",
      sourceId: "review-minutes",
      sourceUrl: minutesUrl,
      mode: "official",
    },
    ...[
      ["VZA76236", "찬성"],
      ["WXJ8352N", "찬성"],
      ["3TP65086", "반대"],
    ].map(([personId, vote]) => ({
      id: `review-vote-${personId}`,
      personId,
      billId: reviewedBillId,
      kind: "표결",
      date: "2026-09-03",
      title,
      vote,
      detail: `국회 임시회의록의 국가정보원법 전자투표 명단에서 ${vote}를 확인했습니다. 인물은 공식 의원 식별자와 지역을 대조했습니다.`,
      sourceId: "review-minutes",
      sourceUrl: minutesUrl,
      mode: "official" as const,
    })),
  ],
};

export type ReviewedAnalysis = {
  personId: string;
  heading: string;
  hypothesis: string;
  evidenceIds: string[];
  support: string;
  counter: string;
  alternative: string;
  reconsider: string;
};
export const reviewedAnalyses: ReviewedAnalysis[] = [
  {
    personId: "VZA76236",
    heading: "정당 간 대립보다, 이 안건의 정보활동 역량 확충을 우선했는가?",
    hypothesis:
      "이성권 의원과 공동 대표발의한 뒤 본회의에서 취지를 설명하고 찬성했습니다. 이 안건에서는 경제·사이버안보 정보활동의 법적 근거를 넓히는 데 정당을 넘는 협력을 택한 것으로 읽을 수 있습니다.",
    evidenceIds: [
      "review-proposal-VZA76236",
      "review-speech-park",
      "review-vote-VZA76236",
    ],
    support:
      "대표발의 → 공개 설명 → 찬성이라는 행동이 같은 방향입니다. 다만 한 법안의 진행 과정에서 나온 기록이므로, 세 개의 독립된 정책 선택으로 세지 않습니다.",
    counter:
      "심사보고서의 수정안은 사이버 활동 의심에 ‘상당한 이유’ 조건을 두고, 경제안보 범위를 대통령령으로 정하도록 했습니다. 이를 제한 없는 권한 확대를 원했다는 증거로 읽으면 안 됩니다.",
    alternative:
      "개인의 장기 전략보다 소관 위원회의 합의안 보고 역할, 전문 분야의 제도 정비, 안건별 절충으로도 설명할 수 있습니다. 다른 정책에서도 같은 협력이 이어질지는 미확인입니다.",
    reconsider:
      "후속 통제·감독 법안의 발의와 표결, 대통령령의 직무 범위에 대한 공개 입장, 정보위 점검 활동을 확인합니다. 권한 제한 강화에 적극적으로 나선다면 ‘확충 우선’ 가설의 범위를 좁힙니다.",
  },
  {
    personId: "3TP65086",
    heading: "안보 역량 확대보다, 권한 남용을 막는 통제를 우선했는가?",
    hypothesis:
      "반대토론에서 민주적 통제와 민간인 사찰 우려를 강조했고 실제 표결에서도 반대했습니다. 이 안건에서는 권한 확대의 효익보다 통제 장치의 충분성을 더 중요하게 판단한 것으로 해석할 수 있습니다.",
    evidenceIds: ["review-speech-yoon", "review-vote-3TP65086"],
    support:
      "공개적으로 밝힌 반대 이유와 표결 방향이 일치합니다. 발언 속 사찰 가능성은 의원의 우려이지, 이 법안으로 이미 발생한 피해의 검증 결과가 아닙니다.",
    counter:
      "수정안에는 ‘의심할만한 상당한 이유’라는 조건과 경제안보 범위의 대통령령 위임이 있습니다. 반대 이유가 최종 조문에 비춰 얼마나 남는지도 따로 검토해야 합니다.",
    alternative:
      "권한 통제에 대한 장기 소신 외에 당의 안건 대응, 본회의 토론 역할, 해당 수정안에 한정한 반대일 수 있습니다. 한 안건으로 안보 정책 전체에 반대한다고 일반화할 수 없습니다.",
    reconsider:
      "감독·통제 장치가 강화된 후속안에 찬성하는지, 직접 대안을 발의하는지 확인합니다. 보완 후에도 이유 설명 없이 반대가 유지된다면 가설을 다시 검토합니다.",
  },
];

export function withReviewed(data: Dataset): Dataset {
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [
    ...new Map([...a, ...b].map((x) => [x.id, x])).values(),
  ];
  const eventKey = (r: Dataset["records"][number]) =>
    [r.personId, r.billId, r.kind, r.date].join("|");
  const reviewedKeys = new Set(reviewed.records.map(eventKey));
  const liveByEvent = new Map(data.records.map((r) => [eventKey(r), r]));
  // Fresh API facts win; stable editorial IDs keep evidence links intact.
  const linked = reviewed.records.map((r) => {
    const live = liveByEvent.get(eventKey(r));
    return live ? { ...live, id: r.id } : r;
  });
  return {
    ...data,
    scope: `${data.scope} 별도로 ${reviewed.scope}`,
    people: merge(reviewed.people, data.people),
    bills: merge(reviewed.bills, data.bills),
    records: merge(
      data.records.filter((r) => !reviewedKeys.has(eventKey(r))),
      linked,
    ),
    sources: merge(data.sources, reviewed.sources),
  };
}

export function getReviewedAnalysis(personId: string, data: Dataset) {
  const analysis = reviewedAnalyses.find((a) => a.personId === personId);
  if (!analysis) return undefined;
  // A corrected underlying vote must invalidate the old interpretation.
  return analysis.evidenceIds.every((id) => {
    const expected = reviewed.records.find((r) => r.id === id);
    const actual = data.records.find((r) => r.id === id);
    return (
      !!expected &&
      !!actual &&
      expected.personId === actual.personId &&
      expected.billId === actual.billId &&
      expected.kind === actual.kind &&
      expected.date === actual.date &&
      expected.vote === actual.vote &&
      (expected.kind !== "발언" ||
        (expected.title === actual.title &&
          expected.detail === actual.detail &&
          expected.quote === actual.quote &&
          expected.sourceUrl === actual.sourceUrl))
    );
  })
    ? analysis
    : undefined;
}
