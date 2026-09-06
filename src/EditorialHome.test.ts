import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EditorialHome from "./EditorialHome";
import { type Dataset, type Category } from "./politics";
const data: Dataset = {
  version: 1, recordedAt: "2026-09-06T00:00:00Z", status: "partial", scope: "test only",
  people: [], records: [], sources: [],
  bills: (["housing", "health", "tax", "care"] as Category[]).map((category, i) => ({
    id: `test-${category}`, number: String(i), title: `TEST_${category}_TITLE`, category,
    proposer: `TEST_${category}_PROPOSER`, date: "2026-09-01", stage: "접수", mode: "official",
  })),
};
const render = (selected?: string, dataset = data) => renderToStaticMarkup(createElement(EditorialHome, { data: dataset, mode: "official", selected, search: () => {} }));
describe("editorial MVP home", () => {
  it("uses source-backed bill fields and links rather than fictional policy claims", () => {
    const html = render();
    expect(html).toContain("TEST_housing_TITLE");
    expect(html).toContain("TEST_housing_PROPOSER");
    expect(html).toContain("#/bill/test-housing");
    expect(html).toContain("/images/housing.webp");
    expect(html).not.toContain("전세 보증금을 지켜줍니다");
    expect(html).not.toContain("발급 화면 열기");
    expect(html).toContain("전체 의안·전체 경력 분석이 아닙니다");
  });
  it("filters by policy and gives taxes and care priority after the lead", () => {
    const html = render();
    expect(html.indexOf("TEST_tax_TITLE")).toBeLessThan(html.indexOf("TEST_health_TITLE"));
    expect(html.indexOf("TEST_care_TITLE")).toBeLessThan(html.indexOf("TEST_health_TITLE"));
    expect(render("tax")).toContain("TEST_tax_TITLE");
    expect(render("tax")).not.toContain("TEST_housing_TITLE");
  });
  it("states missing coverage and does not invent a lead for empty data", () => {
    const html = render(undefined, { ...data, bills: [] });
    expect(html).toContain("현재 수집 범위의 한계");
    expect(html).not.toContain("누가 발의했는지 보기");
  });
  it("does not label a category without artwork as an AI image", () => {
    expect(render("health")).toContain("대표 이미지 없음");
    expect(render("health")).not.toContain("정책 주제 이미지 · AI 생성");
  });
});
