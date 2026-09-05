import { describe, it, expect } from "vitest";
import {
  calculateScenario,
  clusterHeadlines,
  parseHeadlines,
  validateDataset,
  parsePoliticalRoute,
  readFollows,
  markRead,
  recordChanges,
  fingerprint,
  safeUrl,
  type FollowState,
  normalizeOfficialIdentity,
} from "./politics";
import { demo, demoHeadlines } from "./politics-demo";
import {
  reviewed,
  reviewedAnalyses,
  reviewedBillId,
  withReviewed,
  getReviewedAnalysis,
} from "./politics-reviewed";
// Synthetic contract fixture. Never shipped as an official UI snapshot.
const official = structuredClone(demo);
official.people.forEach((p) => {
  p.mode = "official";
  p.sourceId = "test-source";
});
official.bills.forEach((b) => {
  b.mode = "official";
  b.sourceId = "test-source";
});
official.records.forEach((r) => {
  r.mode = "official";
  r.sourceId = "test-source";
});
official.bills[1].vote!.rowsTotal = 300;
official.sources = [
  {
    id: "test-source",
    service: "test fixture only",
    url: "https://example.org/test",
    recordedAt: official.recordedAt,
    returned: 3,
    total: 300,
    complete: false,
  },
];
describe("primary-source reviewed case", () => {
  it("invalidates an interpretation when a reviewed speech or its source is corrected", () => {
    for (const field of ["detail", "sourceUrl"] as const) {
      const fresh = structuredClone(reviewed);
      fresh.records.find((r) => r.id === "review-speech-park")![field] =
        "corrected";
      expect(
        getReviewedAnalysis("VZA76236", withReviewed(fresh)),
      ).toBeUndefined();
    }
  });
  it("prefers refreshed API facts without duplicating editorial evidence", () => {
    const fresh = structuredClone(reviewed);
    fresh.people[0].party = "updated identity field";
    fresh.bills[0].stage = "updated stage";
    fresh.records.forEach((r) => (r.id = "api-" + r.id));
    const merged = withReviewed(fresh);
    expect(merged.people[0].party).toBe("updated identity field");
    expect(merged.bills[0].stage).toBe("updated stage");
    expect(merged.records).toHaveLength(reviewed.records.length);
    expect(getReviewedAnalysis("VZA76236", merged)).toBeDefined();
    expect(withReviewed(merged).records).toHaveLength(merged.records.length);
    fresh.records.find((r) => r.id === "api-review-vote-VZA76236")!.vote =
      "반대";
    expect(
      getReviewedAnalysis("VZA76236", withReviewed(fresh)),
    ).toBeUndefined();
  });
  it("preserves valid provenance and merges without duplicate identities", () => {
    expect(validateDataset(reviewed, "official")).toBe(true);
    expect(validateDataset(withReviewed(official as any), "official")).toBe(
      true,
    );
    expect(withReviewed(withReviewed(official as any)).people).toHaveLength(
      withReviewed(official as any).people.length,
    );
  });
  it("separates joint lead sponsorship, opposition speech and actual votes", () => {
    expect(
      reviewed.records
        .filter((r) => r.kind === "대표발의")
        .map((r) => r.personId)
        .sort(),
    ).toEqual(["VZA76236", "WXJ8352N"]);
    expect(
      reviewed.records.find(
        (r) => r.personId === "3TP65086" && r.kind === "표결",
      )?.vote,
    ).toBe("반대");
    expect(
      reviewed.records.some(
        (r) => r.personId === "3TP65086" && r.kind === "대표발의",
      ),
    ).toBe(false);
    expect(
      reviewed.bills[0].vote!.yes +
        reviewed.bills[0].vote!.no +
        reviewed.bills[0].vote!.abstain,
    ).toBe(252);
  });
  it("ties every analytical evidence link to the same reviewed bill and person", () => {
    for (const analysis of reviewedAnalyses)
      for (const id of analysis.evidenceIds) {
        const r = reviewed.records.find((r) => r.id === id)!;
        expect(r.personId).toBe(analysis.personId);
        expect(r.billId).toBe(reviewedBillId);
        expect(r.mode).toBe("official");
      }
  });
});
describe("official identity, bill and vote evidence", () => {
  it("shows omitted identity fields as missing, without guessing a district or party", () => {
    expect(
      normalizeOfficialIdentity({ PLPT_NM: null, ELECD_NM: null }),
    ).toEqual({ party: "공식 자료 미기재", region: "공식 자료 미기재" });
    expect(
      normalizeOfficialIdentity({ PLPT_NM: "공식 조회값", ELECD_NM: "" }),
    ).toEqual({ party: "공식 조회값", region: "공식 자료 미기재" });
  });
  it("rejects cross-mode records and unknown source references", () => {
    expect(
      validateDataset({
        ...official,
        records: [{ ...official.records[0], mode: "demo" }],
      }),
    ).toBe(false);
    expect(
      validateDataset({
        ...official,
        records: [{ ...official.records[0], sourceId: "ghost" }],
      }),
    ).toBe(false);
    expect(validateDataset(demo, "official")).toBe(false);
    expect(
      validateDataset({
        ...official,
        sources: [{ ...official.sources[0], url: "javascript:alert(1)" }],
      }),
    ).toBe(false);
  });
  it("validates both real and explicitly fictional datasets", () => {
    expect(validateDataset(demo)).toBe(true);
    expect(validateDataset(official)).toBe(true);
  });
  it("uses stable identity keys, not a name join", () => {
    const representative = official.records.find((r) => r.kind === "대표발의")!;
    expect(representative.personId).toBe("demo-ga");
    expect(
      official.people.find((p) => p.id === representative.personId)?.name,
    ).toBe("가상 의원 가");
    expect(official.sources.every((s) => !s.url.includes("KEY="))).toBe(true);
  });
  it("does not turn co-sponsors into yes votes", () => {
    const bill = official.bills[0];
    expect(
      official.records.filter((r) => r.billId === bill.id && r.kind === "표결"),
    ).toHaveLength(0);
    expect(bill.vote).toBeUndefined();
  });
  it("keeps roll-call row denominator separate from total votes", () => {
    const v = official.bills[1].vote!;
    expect(v.yes + v.no + v.abstain).toBe(v.voted);
    expect(v.rowsTotal).not.toBe(v.voted);
    expect(v.rowsReturned).toBeLessThan(v.rowsTotal);
  });
  it("rejects a broken person/bill relation", () => {
    expect(
      validateDataset({
        ...demo,
        records: [{ ...demo.records[0], personId: "missing" }],
      }),
    ).toBe(false);
    expect(
      validateDataset({
        ...demo,
        records: [{ ...demo.records[0], billId: "missing" }],
      }),
    ).toBe(false);
  });
  it("rejects inconsistent vote totals", () => {
    expect(
      validateDataset({
        ...demo,
        bills: [
          { ...demo.bills[1], vote: { ...demo.bills[1].vote!, yes: 999 } },
        ],
      }),
    ).toBe(false);
  });
});
describe("headline context sieve", () => {
  it("groups common action coverage, retaining all original headlines", () => {
    const groups = clusterHeadlines(demoHeadlines);
    expect(groups).toHaveLength(4);
    expect(groups.flatMap((g) => g.items)).toHaveLength(6);
    expect(groups[0].items).toHaveLength(3);
  });
  it("keeps corrections and rebuttals separate", () => {
    const groups = clusterHeadlines(demoHeadlines);
    expect(groups.some((g) => g.items[0].relation === "correction")).toBe(true);
    expect(groups.some((g) => g.items[0].relation === "rebuttal")).toBe(true);
  });
  it("does not merge look-alike titles without reviewed event links", () => {
    const h = demoHeadlines[0];
    expect(
      clusterHeadlines([
        { ...h, verifiedLink: false },
        { ...h, id: "other", verifiedLink: false },
      ]),
    ).toHaveLength(2);
  });
  it("does not merge different bills, people, action types, event days or opposition", () => {
    const h = demoHeadlines[0];
    for (const changed of [
      { billId: "another" },
      { personIds: ["another"] },
      { action: "부결" },
      { eventDate: "2026-09-01" },
      { relation: "rebuttal" as const },
    ])
      expect(
        clusterHeadlines([h, { ...h, ...changed, id: "other" }]),
      ).toHaveLength(2);
  });
  it("does not treat votes on one bill as another bill", () => {
    expect(demoHeadlines.find((h) => h.id === "h6")?.billId).toBe("demo-tax");
  });
  it("requires rights confirmation and bounded valid JSON", () => {
    expect(() => parseHeadlines(JSON.stringify(demoHeadlines), false)).toThrow(
      "권한",
    );
    expect(() => parseHeadlines("broken", true)).toThrow("JSON");
    expect(() => parseHeadlines("[]", true)).toThrow("1~200");
    expect(() => parseHeadlines("x".repeat(200001), true)).toThrow("200KB");
  });
  it("accepts reviewed rows and blocks unsafe links or duplicate ids", () => {
    expect(parseHeadlines(JSON.stringify(demoHeadlines), true)).toHaveLength(6);
    expect(() =>
      parseHeadlines(
        JSON.stringify([{ ...demoHeadlines[0], url: "javascript:alert(1)" }]),
        true,
      ),
    ).toThrow("http");
    expect(() =>
      parseHeadlines(
        JSON.stringify([demoHeadlines[0], demoHeadlines[0]]),
        true,
      ),
    ).toThrow("중복");
  });
});
describe("conditional scenarios, not predicted probabilities", () => {
  const base = {
    members: 300,
    present: 270,
    yes: 120,
    no: 90,
    abstain: 0,
    unknown: 60,
    switchToYes: 0,
    switchFromYes: 0,
    unknownToYes: 0,
  };
  it("computes a strict majority, not half rounded up", () => {
    expect(calculateScenario(base)).toMatchObject({
      valid: true,
      threshold: 136,
      needed: 16,
      outcome: "미정 표에 따라 달라짐",
    });
  });
  it("switches at the correct threshold", () => {
    expect(calculateScenario({ ...base, unknownToYes: 16 })).toMatchObject({
      outcome: "가결 요건 충족",
      yes: 136,
    });
    expect(calculateScenario({ ...base, unknownToYes: 15 })).toMatchObject({
      needed: 1,
    });
  });
  it("tracks withdrawn yes support separately", () => {
    expect(
      calculateScenario({ ...base, unknownToYes: 16, switchFromYes: 1 }),
    ).toMatchObject({ yes: 135, needed: 1 });
  });
  it("checks quorum and rejects impossible inputs", () => {
    expect(calculateScenario({ ...base, members: 600 })).toMatchObject({
      outcome: "정족수 미달",
    });
    for (const change of [
      { present: 301 },
      { unknownToYes: 61 },
      { switchFromYes: 121 },
      { yes: -1 },
      { yes: 1.5 },
      { yes: NaN },
    ])
      expect(calculateScenario({ ...base, ...change }).valid).toBe(false);
  });
});
describe("politician follows and visible change history", () => {
  const person = "demo-ga";
  const records = demo.records.filter((r) => r.personId === person);
  const state: FollowState = {
    version: 1,
    people: {
      [person]: {
        followedAt: "2026-09-05",
        seen: Object.fromEntries(records.map((r) => [r.id, fingerprint(r)])),
      },
    },
  };
  it("keeps existing records quiet", () =>
    expect(recordChanges(state, person, records)).toHaveLength(0));
  it("distinguishes new evidence from corrected evidence", () => {
    const changed = [
      { ...records[0], detail: "정정" },
      ...records.slice(1),
      { ...records[0], id: "new" },
    ];
    expect(recordChanges(state, person, changed).map((c) => c.type)).toEqual([
      "변경",
      "새 기록",
    ]);
  });
  it("clears unread changes only after an explicit mark-read action", () => {
    const changed = [...records, { ...records[0], id: "new" }];
    expect(
      recordChanges(markRead(state, person, changed), person, changed),
    ).toHaveLength(0);
  });
  it("handles corrupt or blocked storage and keeps legacy storage untouched", () => {
    expect(readFollows({ getItem: () => "{" })).toEqual({
      version: 1,
      people: {},
    });
    expect(
      readFollows({
        getItem: () => {
          throw Error();
        },
      }),
    ).toEqual({ version: 1, people: {} });
    expect(readFollows({ getItem: () => JSON.stringify(state) })).toEqual(
      state,
    );
  });
});
describe("routing and link safety", () => {
  it("retains selected profile panel in direct links", () =>
    expect(
      parsePoliticalRoute("#/politician/demo-ga?tab=analysis"),
    ).toMatchObject({ page: "politician", id: "demo-ga", tab: "analysis" }));
  it("recovers malformed paths", () =>
    expect(parsePoliticalRoute("#/politician/%zz").page).toBe("missing"));
  it("rejects credentials and active URL schemes", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://secret@example.com")).toBeUndefined();
    expect(safeUrl("https://assembly.go.kr")).toBe("https://assembly.go.kr/");
  });
});
