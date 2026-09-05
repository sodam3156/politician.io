export type Mode = "official" | "demo";
export type Category = "housing" | "tax" | "care" | "health" | "safety";
export type Person = {
  id: string;
  name: string;
  party: string;
  region: string;
  committee?: string;
  term?: string;
  mode: Mode;
  categories: Category[];
  sourceId?: string;
  sourceUrl?: string;
};
export type RecordItem = {
  id: string;
  personId: string;
  billId: string;
  kind: string;
  date: string;
  title: string;
  detail: string;
  quote?: string;
  vote?: string;
  partyAtEvent?: string;
  sourceId?: string;
  sourceUrl?: string;
  mode: Mode;
};
export type VoteTotal = {
  rowNote?: string;
  yes: number;
  no: number;
  abstain: number;
  voted: number;
  members: number;
  date: string;
  sourceId?: string;
  rowsTotal: number;
  rowsReturned: number;
};
export type Bill = {
  id: string;
  number: string;
  title: string;
  category: Category;
  proposer: string;
  stage: string;
  date: string;
  mode: Mode;
  sourceId?: string;
  sourceUrl?: string;
  committee?: string;
  governmentDate?: string;
  promulgatedDate?: string;
  sponsorsTotal?: number;
  sponsorsReturned?: number;
  vote?: VoteTotal;
};
export type Source = {
  note?: string;
  id: string;
  service: string;
  url: string;
  recordedAt: string;
  returned: number;
  total: number;
  complete: boolean;
};
export type Dataset = {
  version: number;
  collectionMode?: "authenticated" | "sample" | "unconfigured";
  recordedAt: string;
  status: string;
  scope: string;
  people: Person[];
  bills: Bill[];
  records: RecordItem[];
  sources: Source[];
};
export type Headline = {
  id: string;
  title: string;
  publisher: string;
  url?: string;
  publishedAt: string;
  personIds: string[];
  billId?: string;
  eventId?: string;
  action: string;
  eventDate: string;
  relation: "report" | "correction" | "rebuttal" | "new";
  verifiedLink: boolean;
  mode: Mode;
};
export type ContextGroup = {
  id: string;
  items: Headline[];
  linked: boolean;
  summary: string;
  duplicates: number;
};
export const categories: {
  id: Category;
  label: string;
  description: string;
}[] = [
  { id: "housing", label: "부동산 정책", description: "전월세 · 주거" },
  { id: "tax", label: "세금 정책", description: "소득세 · 공제" },
  { id: "care", label: "소외계층 정책", description: "돌봄 · 지원" },
  { id: "health", label: "보건 정책", description: "건강보험" },
  { id: "safety", label: "사회·안전 정책", description: "재난 · 피해자 권리" },
];
export const categoryLabel = (id: string) =>
  categories.find((c) => c.id === id)?.label ?? "기타 정책";
export function normalizeOfficialIdentity(row: {
  PLPT_NM?: unknown;
  ELECD_NM?: unknown;
}) {
  const field = (value: unknown) =>
    typeof value === "string" && value.trim() ? value : "공식 자료 미기재";
  return { party: field(row.PLPT_NM), region: field(row.ELECD_NM) };
}
export const personHref = (id: string, tab = "records") =>
  `#/politician/${encodeURIComponent(id)}?tab=${tab}`;
export const billHref = (id: string) => `#/bill/${encodeURIComponent(id)}`;
export function safeUrl(value?: string) {
  try {
    const u = new URL(value ?? "");
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function validateDataset(
  value: unknown,
  expectedMode?: Mode,
): value is Dataset {
  if (!value || typeof value !== "object") return false;
  const d = value as Dataset;
  if (
    d.version !== 1 ||
    !Array.isArray(d.people) ||
    !Array.isArray(d.bills) ||
    !Array.isArray(d.records) ||
    !Array.isArray(d.sources) ||
    !Number.isFinite(Date.parse(d.recordedAt))
  )
    return false;
  if (
    !d.people.every(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.party === "string" &&
        typeof p.region === "string" &&
        Array.isArray(p.categories) &&
        p.categories.every((c) => categories.some((x) => x.id === c)) &&
        ["official", "demo"].includes(p.mode) &&
        (!expectedMode || p.mode === expectedMode),
    )
  )
    return false;
  if (
    !d.bills.every(
      (b) =>
        b &&
        typeof b.id === "string" &&
        typeof b.title === "string" &&
        ["official", "demo"].includes(b.mode) &&
        (!expectedMode || b.mode === expectedMode),
    )
  )
    return false;
  if (
    !d.sources.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        !!safeUrl(s.url) &&
        Number.isInteger(s.total) &&
        Number.isInteger(s.returned) &&
        s.returned >= 0 &&
        s.returned <= s.total,
    )
  )
    return false;
  const sourceIds = new Set(d.sources.map((s) => s.id));
  const sourceValid = (v: {
    mode: Mode;
    sourceId?: string;
    sourceUrl?: string;
  }) =>
    (!v.sourceUrl || !!safeUrl(v.sourceUrl)) &&
    (v.mode === "demo" || (!!v.sourceId && sourceIds.has(v.sourceId)));
  const ids = new Set(d.people.map((p) => p.id)),
    billIds = new Set(d.bills.map((b) => b.id));
  if (ids.size !== d.people.length || billIds.size !== d.bills.length)
    return false;
  return (
    d.people.every(sourceValid) &&
    new Set(d.records.map((r) => r?.id)).size === d.records.length &&
    d.records.every(
      (r) =>
        r &&
        typeof r.id === "string" &&
        ids.has(r.personId) &&
        billIds.has(r.billId) &&
        r.mode === d.people.find((p) => p.id === r.personId)?.mode &&
        r.mode === d.bills.find((b) => b.id === r.billId)?.mode &&
        typeof r.detail === "string" &&
        typeof r.kind === "string" &&
        Number.isFinite(Date.parse(r.date)) &&
        sourceValid(r),
    ) &&
    d.bills.every(
      (b) =>
        sourceValid(b) &&
        (!b.vote ||
          (Object.values({
            yes: b.vote.yes,
            no: b.vote.no,
            abstain: b.vote.abstain,
            voted: b.vote.voted,
            members: b.vote.members,
          }).every((n) => Number.isInteger(n) && n >= 0) &&
            b.vote.yes + b.vote.no + b.vote.abstain === b.vote.voted &&
            b.vote.voted <= b.vote.members)),
    )
  );
}
const normalized = (s: string) =>
  s
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
export function clusterHeadlines(rows: Headline[]): ContextGroup[] {
  const grouped = new Map<string, Headline[]>();
  for (const row of rows) {
    // Only explicit, reviewed identity+event links permit semantic grouping.
    // A correction/rebuttal is a separate context, never discarded as a duplicate.
    const linked =
      row.verifiedLink &&
      row.personIds.length > 0 &&
      !!(row.billId || row.eventId);
    const key = linked
      ? [...row.personIds].sort().join(",") +
        "|" +
        (row.billId || row.eventId) +
        "|" +
        row.action +
        "|" +
        row.eventDate +
        "|" +
        row.relation
      : "unlinked|" + row.id;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return [...grouped.entries()].map(([id, items]) => ({
    id,
    items,
    linked: !id.startsWith("unlinked|"),
    summary: items[0].title,
    duplicates:
      items.length - new Set(items.map((x) => normalized(x.title))).size,
  }));
}
export function parseHeadlines(text: string, allowed: boolean): Headline[] {
  if (!allowed)
    throw new Error("제목 저장·가공 권한을 확인한 자료만 가져올 수 있습니다.");
  if (text.length > 200000)
    throw new Error("200KB 이하의 제목 묶음을 사용해주세요.");
  let rows: unknown;
  try {
    rows = JSON.parse(text);
  } catch {
    throw new Error("JSON 형식이 아닙니다. 아래 예시 형식을 확인해주세요.");
  }
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 200)
    throw new Error("제목을 1~200개 입력해주세요.");
  const ids = new Set<string>();
  return rows.map((row: unknown, i) => {
    const r = row as Partial<Headline>;
    if (
      !r ||
      typeof r.title !== "string" ||
      !r.title.trim() ||
      r.title.length > 500 ||
      typeof r.publisher !== "string" ||
      !Number.isFinite(Date.parse(r.publishedAt ?? ""))
    )
      throw new Error(
        `${i + 1}번째 제목의 title, publisher, publishedAt을 확인해주세요.`,
      );
    const id = typeof r.id === "string" ? r.id : `import-${i}`;
    if (ids.has(id))
      throw new Error(
        "제목 id가 중복되었습니다. 각 기록에 다른 id를 지정해주세요.",
      );
    ids.add(id);
    if (r.url && !safeUrl(r.url))
      throw new Error("원문 링크는 http 또는 https 주소여야 합니다.");
    const relation = ["report", "correction", "rebuttal", "new"].includes(
      r.relation ?? "",
    )
      ? r.relation!
      : "report";
    return {
      id,
      title: r.title.trim(),
      publisher: r.publisher,
      url: safeUrl(r.url),
      publishedAt: r.publishedAt!,
      personIds: Array.isArray(r.personIds)
        ? r.personIds.filter((p): p is string => typeof p === "string")
        : [],
      billId: typeof r.billId === "string" ? r.billId : undefined,
      eventId: typeof r.eventId === "string" ? r.eventId : undefined,
      action: typeof r.action === "string" ? r.action : "연결 검토",
      eventDate:
        typeof r.eventDate === "string"
          ? r.eventDate
          : r.publishedAt!.slice(0, 10),
      relation,
      verifiedLink: r.verifiedLink === true,
      mode: r.mode === "demo" ? "demo" : "official",
    };
  });
}
export type ScenarioInput = {
  members: number;
  present: number;
  yes: number;
  no: number;
  abstain: number;
  unknown: number;
  switchToYes: number;
  switchFromYes: number;
  unknownToYes: number;
};
export function calculateScenario(input: ScenarioInput) {
  const v = Object.values(input);
  if (
    v.some((n) => !Number.isInteger(n) || n < 0) ||
    input.present > input.members ||
    input.yes + input.no + input.abstain + input.unknown !== input.present ||
    input.switchToYes > input.no ||
    input.switchFromYes > input.yes ||
    input.unknownToYes > input.unknown
  )
    return {
      valid: false,
      reason: "재적·출석·찬반·미정 인원과 이동 인원을 확인해주세요.",
    } as const;
  const threshold = Math.floor(input.present / 2) + 1;
  const quorum = input.present > input.members / 2;
  const yes =
    input.yes + input.switchToYes - input.switchFromYes + input.unknownToYes;
  const unknown = input.unknown - input.unknownToYes;
  const outcome = !quorum
    ? "정족수 미달"
    : yes >= threshold
      ? "가결 요건 충족"
      : yes + unknown < threshold
        ? "현재 조건에서 가결 요건 미달"
        : "미정 표에 따라 달라짐";
  return {
    valid: true,
    threshold,
    quorum,
    yes,
    unknown,
    outcome,
    needed: Math.max(0, threshold - yes),
  } as const;
}
export type FollowState = {
  version: 1;
  people: Record<string, { followedAt: string; seen: Record<string, string> }>;
};
export const FOLLOW_KEY = "pandan.politicians.v1";
export const fingerprint = (r: RecordItem) =>
  JSON.stringify([
    r.date,
    r.kind,
    r.title,
    r.detail,
    r.quote,
    r.vote,
    r.billId,
  ]);
export function readFollows(storage: Pick<Storage, "getItem">): FollowState {
  try {
    const v = JSON.parse(storage.getItem(FOLLOW_KEY) ?? "null");
    if (
      v?.version === 1 &&
      v.people &&
      typeof v.people === "object" &&
      !Array.isArray(v.people)
    ) {
      const people: FollowState["people"] = {};
      for (const [id, f] of Object.entries(v.people) as [string, any][]) {
        if (
          f &&
          typeof f.followedAt === "string" &&
          f.seen &&
          typeof f.seen === "object" &&
          !Array.isArray(f.seen)
        )
          people[id] = {
            followedAt: f.followedAt,
            seen: Object.fromEntries(
              Object.entries(f.seen).filter(([, s]) => typeof s === "string"),
            ) as Record<string, string>,
          };
      }
      return { version: 1, people };
    }
  } catch {}
  return { version: 1, people: {} };
}
export function recordChanges(
  state: FollowState,
  personId: string,
  records: RecordItem[],
) {
  const seen = state.people[personId]?.seen;
  if (!seen) return [];
  return records
    .filter((r) => r.personId === personId && seen[r.id] !== fingerprint(r))
    .map((r) => ({ record: r, type: seen[r.id] ? "변경" : "새 기록" }));
}
export function markRead(
  state: FollowState,
  personId: string,
  records: RecordItem[],
): FollowState {
  const current = state.people[personId];
  if (!current) return state;
  return {
    ...state,
    people: {
      ...state.people,
      [personId]: {
        ...current,
        seen: Object.fromEntries(
          records
            .filter((r) => r.personId === personId)
            .map((r) => [r.id, fingerprint(r)]),
        ),
      },
    },
  };
}
export function parsePoliticalRoute(hash: string) {
  try {
    const [path, query = ""] = hash.replace(/^#/, "").split("?");
    const parts = path.split("/").filter(Boolean);
    return {
      page: parts[0] ?? "home",
      id: decodeURIComponent(parts[1] ?? ""),
      tab: new URLSearchParams(query).get("tab") ?? "records",
      mode:
        new URLSearchParams(query).get("mode") === "demo"
          ? ("demo" as const)
          : ("official" as const),
    };
  } catch {
    return {
      page: "missing",
      id: "",
      tab: "records",
      mode: "official" as const,
    };
  }
}
