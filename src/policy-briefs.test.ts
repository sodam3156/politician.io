import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Bill, Dataset } from "./politics";
import { getPolicyBrief, policyBriefs, policyHeadline, proposalSource, proposalStatus } from "./policy-briefs";
import EditorialHome from "./EditorialHome";
import PolicyReading, { PolicyReadingHeader } from "./PolicyReading";

const bill = (index: number): Bill => ({ ...policyBriefs[index], category: ["housing", "tax", "care", "health", "safety", "safety"][index] as Bill["category"], proposer: "검증용 제안자", stage: "접수", mode: "official" });
const data: Dataset = { version: 1, status: "partial", scope: "test", recordedAt: "2026-09-06T00:00:00Z", bills: policyBriefs.map((_, i) => bill(i)), people: [], records: [], sources: [] };

describe("source-backed ordinary-life policy reading", () => {
  it.each(policyBriefs.map((b, i) => [b.number, i] as const))("binds %s to its exact identity and official proposal source", (_, index) => {
    const b = bill(index);
    expect(getPolicyBrief(b)?.number).toBe(b.number);
    const url = new URL(proposalSource(policyBriefs[index]));
    expect(url.hostname).toBe("likms.assembly.go.kr");
    expect(url.searchParams.get("billId")).toBe(b.id);
    for (const field of ["id", "number", "title", "date"] as const)
      expect(getPolicyBrief({ ...b, [field]: "different" })).toBeUndefined();
    expect(getPolicyBrief({ ...b, mode: "demo" })).toBeUndefined();
  });
  it("puts human-readable changes in headings, not law names or feature promotion", () => {
    const html = renderToStaticMarkup(createElement(EditorialHome, { data, mode: "official", search: () => {} }));
    const headings = [...html.matchAll(/<h[123][^>]*>(.*?)<\/h[123]>/g)].map(m => m[1]).join(" ");
    expect(headings).toContain("노인 돌봄시설");
    expect(headings).toContain("기본공제");
    expect(headings).not.toContain("일부개정법률안");
    expect(html).not.toContain("정치인을 만나다");
    expect(html).toContain("제안 단계 · 확정 아님");
    expect(html).toContain("변경 내용 읽기");
    expect(html).toContain("주택법 일부개정법률안"); // secondary legal identification retained
  });
  it("does not confuse tax eligibility, deduction amount and refund", () => {
    const html = renderToStaticMarkup(createElement(PolicyReading, { bill: bill(1) }));
    expect(html).toContain("100만원");
    expect(html).toContain("300만원");
    expect(html).toContain("750만원");
    expect(html).toContain("다른 공제 요건도 충족할 때");
    expect(html).toContain("돌려받는 세금이 아닙니다");
    expect(html).toContain("기본공제액 150만원을 올리는 안도 아닙니다");
  });
  it("does not turn administration changes into new welfare benefits", () => {
    const html = renderToStaticMarkup(createElement(PolicyReadingHeader, { bill: bill(2) }));
    expect(html).toContain("지원금이나 창업 혜택을 늘리는 안이 아닙니다");
    const home = renderToStaticMarkup(createElement(EditorialHome, { data, mode: "official", selected: "care", search: () => {} }));
    expect(home).not.toContain("care.webp");
    expect(home).toContain("대표를 누가");
  });
  it("keeps submission text separate from passed/enacted status", () => {
    const passed = { ...bill(5), stage: "본회의의결", promulgatedDate: "2026-09-30" };
    expect(proposalStatus(passed)).toBe("본회의의결 · 시행 여부 별도 확인");
    const html = renderToStaticMarkup(createElement(PolicyReading, { bill: passed }));
    expect(html).toContain("최종 조문과 같다는 뜻이 아닙니다");
  });
  it("falls back honestly when an unreviewed bill arrives", () => {
    const unknown = { ...bill(0), id: "unknown" };
    expect(policyHeadline(unknown)).toContain("확인 중");
    expect(renderToStaticMarkup(createElement(PolicyReading, { bill: unknown }))).toContain("아직 검증된 쉬운 설명이 없습니다");
  });
});
