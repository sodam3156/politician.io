// Bounded official API collection; credentials never enter browser assets.
import { mkdir, writeFile, rename, copyFile } from "node:fs/promises";
import { createAssemblyClient } from "./assembly-client.mjs";
import { validateDataset, normalizeOfficialIdentity } from "../src/politics.ts";
const full = process.argv.includes("--full");
const client = createAssemblyClient({
  key: process.env.ASSEMBLY_API_KEY,
  full,
});
const read = client.read,
  sources = client.sources;
const billIds = [
  "PRC_E2E6C0B8B2A1A0W9X3V2U0U4S6T9B2",
  "PRC_Z2L6E0Q8A2T7V1W6Z3X7N3B3Z5M7D7",
  "PRC_K2H6X0W6K1H6E1D1C4A5J5G5E7N9P7",
  "PRC_Z2Z6X0Y8W2X4V1W3S4Q2R2P1Q1O9P8",
  "PRC_Z2I5G0G1E0F6E1E1A2A6Z4X1Y5W5X6",
  "PRC_L2L6J0K2I2E6F1D0E1C4C1B4C4J0K2",
];
const bills = [],
  records = [],
  people = new Map();
for (const [i, billId] of billIds.entries()) {
  const billNo = [
    "2221107",
    "2220987",
    "2221061",
    "2221082",
    "2221086",
    "2217540",
  ][i];
  const data = await read("ALLBILLV2", { ERACO: "제22대", BILL_NO: billNo });
  const row = data.rows.find((r) => r.BILL_ID === billId);
  if (!row) throw new Error(`Requested bill not found: ${billNo}`);
  const bill = {
    id: billId,
    number: billNo,
    title: row.BILL_NM,
    category: ["health", "safety", "housing", "tax", "care", "safety"][i],
    proposer: row.PPSR_NM,
    stage: row.PROC_STAGE_CD,
    date: row.PPSL_DT,
    sourceId: data.sourceId,
    sourceUrl: row.LINK_URL,
    mode: "official",
    committee: row.JRCMIT_NM,
    governmentDate: row.GVRN_TRSF_DT,
    promulgatedDate: row.PROM_DT,
  };
  if (i !== 1) {
    const sponsors = await read("BILLINFOPPSR", { BILL_ID: billId });
    bill.sponsorsTotal = sponsors.total;
    bill.sponsorsReturned = sponsors.rows.length;
    for (const p of sponsors.rows) {
      if (!p.NASS_CD) continue;
      people.set(p.NASS_CD, { id: p.NASS_CD, name: p.PPSR_NM });
      records.push({
        id: `${billNo}-sponsor-${p.NASS_CD}`,
        personId: p.NASS_CD,
        billId,
        kind: p.REP_DIV === "대표발의" ? "대표발의" : "공동발의",
        date: p.PPSL_DT,
        title: row.BILL_NM,
        detail:
          p.REP_DIV === "대표발의"
            ? "대표발의자로 등록되어 있습니다."
            : "발의자 명단에 포함되어 있습니다. 공동발의는 찬성 표결과 다릅니다.",
        sourceId: p.__sourceId,
        sourceUrl: row.LINK_URL,
        mode: "official",
      });
    }
  }
  if (i === 1 || i === 5) {
    const totals = await read("ncocpgfiaoituanbr", {
      AGE: "22",
      BILL_NO: billNo,
    });
    const t = totals.rows.find((r) => r.BILL_ID === billId);
    if (!t || t.YES_TCNT + t.NO_TCNT + t.BLANK_TCNT !== t.VOTE_TCNT)
      throw new Error("Vote total mismatch");
    bill.vote = {
      yes: t.YES_TCNT,
      no: t.NO_TCNT,
      abstain: t.BLANK_TCNT,
      voted: t.VOTE_TCNT,
      members: t.MEMBER_TCNT,
      date: t.PROC_DT,
      sourceId: totals.sourceId,
    };
    const votes = await read("nojepdqqaweusdfbi", {
      AGE: "22",
      BILL_ID: billId,
    });
    bill.vote.rowsTotal = votes.total;
    bill.vote.rowsReturned = votes.rows.length;
    for (const v of votes.rows) {
      if (!v.MONA_CD || v.BILL_ID !== billId) continue;
      const voteDay = String(v.VOTE_DATE ?? "").slice(0, 8);
      if (voteDay !== t.PROC_DT.replaceAll("-", ""))
        throw new Error(
          "Roll-call event date mismatch; existing snapshot preserved.",
        );
      people.set(v.MONA_CD, { id: v.MONA_CD, name: v.HG_NM });
      records.push({
        id: `${billNo}-vote-${v.MONA_CD}`,
        personId: v.MONA_CD,
        billId,
        kind: "표결",
        vote: v.RESULT_VOTE_MOD,
        partyAtEvent: v.POLY_NM,
        date: `${voteDay.slice(0, 4)}-${voteDay.slice(4, 6)}-${voteDay.slice(6, 8)}`,
        eventTime: v.VOTE_DATE,
        session: v.SESSION_CD,
        meeting: v.CURRENTS_CD,
        title: row.BILL_NM,
        detail: `해당 안건 표결 기록: ${v.RESULT_VOTE_MOD}. 이 기록만으로 다른 정책 입장을 일반화하지 않습니다.`,
        sourceId: v.__sourceId,
        sourceUrl: row.LINK_URL,
        mode: "official",
      });
    }
  }
  bills.push(bill);
}
const allIdentities = full ? await read("ALLNAMEMBER", {}) : null;
for (const person of people.values()) {
  const identity =
    allIdentities ?? (await read("ALLNAMEMBER", { NAAS_CD: person.id }));
  const r = identity.rows.find((r) => r.NAAS_CD === person.id);
  if (!r) throw new Error(`Identity join failed: ${person.id}`);
  Object.assign(person, {
    ...normalizeOfficialIdentity(r),
    committee: r.BLNG_CMIT_NM,
    term: r.GTELT_ERACO,
    mode: "official",
    sourceId: r.__sourceId,
    sourceUrl: sources.find((s) => s.id === r.__sourceId).url,
    categories: [
      ...new Set(
        records
          .filter((e) => e.personId === person.id)
          .map((e) => bills.find((b) => b.id === e.billId).category),
      ),
    ],
  });
}
const snapshot = {
  version: 1,
  recordedAt: new Date().toISOString(),
  status: full ? "authenticated" : "partial",
  collectionMode: full ? "authenticated" : "sample",
  scope: full
    ? "선택한 여섯 의안의 인증 수집 기록; 전체 의안·전체 경력 분석 아님"
    : "국회 공개 샘플: API별 최대 5행. 전체 정치인/발의자/표결 명단이 아닙니다.",
  people: [...people.values()],
  bills,
  records,
  sources,
};
if (!validateDataset(snapshot, "official"))
  throw new Error("SNAPSHOT_INVALID: Existing snapshot preserved.");
await mkdir("public/data", { recursive: true });
await writeFile(
  "public/data/assembly.next.json",
  JSON.stringify(snapshot, null, 2),
);
await mkdir(".local", { recursive: true });
try {
  await copyFile("public/data/assembly.json", ".local/assembly.previous.json");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await rename("public/data/assembly.next.json", "public/data/assembly.json");
console.log(
  JSON.stringify({
    requests: client.requests,
    people: people.size,
    bills: bills.length,
    records: records.length,
    status: snapshot.status,
  }),
);
