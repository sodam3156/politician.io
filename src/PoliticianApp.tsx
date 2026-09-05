import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookmarkSimple,
  Check,
  FileText,
  MagnifyingGlass,
  X,
  Users,
  Scales,
  ArrowsClockwise,
  DownloadSimple,
  Info,
  HouseLine,
  Calculator,
  HandHeart,
} from "@phosphor-icons/react";
import {
  billHref,
  calculateScenario,
  categories,
  categoryLabel,
  clusterHeadlines,
  FOLLOW_KEY,
  fingerprint,
  markRead,
  parseHeadlines,
  parsePoliticalRoute,
  personHref,
  readFollows,
  recordChanges,
  safeUrl,
  validateDataset,
  type Bill,
  type Dataset,
  type FollowState,
  type Headline,
  type Mode,
  type Person,
  type RecordItem,
} from "./politics";
import { demo, demoHeadlines } from "./politics-demo";
import {
  withReviewed,
  getReviewedAnalysis,
  reviewedBillId,
  reportUrl,
  minutesUrl,
} from "./politics-reviewed";
import "./politicians.css";

const ENABLE_DEMO = import.meta.env.VITE_ENABLE_DEMO === "true";
type Tab = "records" | "context" | "analysis" | "scenario";
const tabs: { id: Tab; label: string }[] = [
  { id: "records", label: "말과 행동" },
  { id: "context", label: "보도 속 핵심 맥락" },
  { id: "analysis", label: "행동에서 읽는 의도" },
  { id: "scenario", label: "판도 시나리오" },
];
const empty: Dataset = {
  version: 1,
  recordedAt: "2026-09-05T00:00:00Z",
  status: "partial",
  scope: "공식 기록을 불러오는 중입니다.",
  people: [],
  bills: [],
  records: [],
  sources: [],
};
const formatDate = (date: string) => new Date(date).toLocaleDateString("ko-KR");
const identityHistory = (value: string) =>
  [
    ...new Set(
      value
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].join(" · ");
function External({ url, children }: { url?: string; children: ReactNode }) {
  const href = safeUrl(url);
  return href ? (
    <a className="text-link" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={17} aria-label="새 창" />
    </a>
  ) : null;
}
function Label({ mode }: { mode: Mode }) {
  return (
    <span className={`evidence-label ${mode}`}>
      {mode === "official" ? "공식 기록" : "가상 시연"}
    </span>
  );
}
function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      before?.focus();
    };
  }, []);
  return (
    <dialog
      className="modal"
      ref={ref}
      aria-labelledby="dialog-heading"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="modal-heading">
        <h2 id="dialog-heading">{title}</h2>
        <button className="icon-button" aria-label="닫기" onClick={close}>
          <X size={24} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function EvidenceDetail({
  record,
  data,
  close,
}: {
  record: RecordItem;
  data: Dataset;
  close: () => void;
}) {
  const source = data.sources.find((s) => s.id === record.sourceId);
  return (
    <Dialog title="기록의 근거" close={close}>
      <Label mode={record.mode} />
      <h3>{record.title}</h3>
      <p className="muted">
        {record.date} · {record.kind}
        {record.vote && ` / ${record.vote}`}
      </p>
      {record.quote && <blockquote>{record.quote}</blockquote>}
      <p>{record.detail}</p>
      <dl className="source-metadata">
        <div>
          <dt>인물 식별자</dt>
          <dd>{record.personId}</dd>
        </div>
        <div>
          <dt>연결 의안</dt>
          <dd>{record.billId}</dd>
        </div>
        <div>
          <dt>확인 시점</dt>
          <dd>
            {source
              ? new Date(source.recordedAt).toLocaleString("ko-KR")
              : "가상 자료 · 수집하지 않음"}
          </dd>
        </div>
        <div>
          <dt>자료 범위</dt>
          <dd>
            {source
              ? `${source.returned} / ${source.total}행 확인${source.complete ? "" : " · 해당 페이지의 일부 행"}`
              : "제품 흐름 설명을 위한 자체 작성 자료"}
          </dd>
        </div>
      </dl>
      {source?.note && <p className="data-notice">{source.note}</p>}
      <External url={record.sourceUrl}>기록 원문 확인</External>
      <External url={source?.url}>연결에 사용한 공식 자료</External>
      <p className="data-notice">
        {record.mode === "official"
          ? "공동발의, 찬성 표결, 법률 시행은 서로 다른 사실입니다. 자료가 없다는 이유로 활동이 없다고 평가하지 않습니다."
          : "실존 정치인이나 실제 법안에 대한 기록이 아닙니다."}
      </p>
    </Dialog>
  );
}
function FollowButton({
  person,
  state,
  toggle,
}: {
  person: Person;
  state: FollowState;
  toggle: (p: Person) => void;
}) {
  const saved = !!state.people[person.id];
  return (
    <button
      className={`button ${saved ? "secondary" : "primary"}`}
      aria-pressed={saved}
      onClick={() => toggle(person)}
    >
      <BookmarkSimple
        size={19}
        weight={saved ? "fill" : "regular"}
        aria-hidden="true"
      />
      {saved ? "추적 중" : "이 정치인 추적하기"}
    </button>
  );
}
function PersonCard({
  person,
  data,
  state,
  toggle,
}: {
  person: Person;
  data: Dataset;
  state: FollowState;
  toggle: (p: Person) => void;
}) {
  const records = data.records.filter((r) => r.personId === person.id);
  return (
    <article className="politician-card">
      <div className="person-card-top">
        <Label mode={person.mode} />
        <span>{records.length}개 연결 기록</span>
      </div>
      <h3>
        <a href={personHref(person.id)}>
          {person.name}
          <ArrowUpRight size={22} aria-hidden="true" />
        </a>
      </h3>
      <p>
        {identityHistory(person.party)}
        <br />
        {identityHistory(person.region)}
      </p>
      <small className="small-note">정당·선거구 조회 이력 포함</small>
      <div className="person-policy-tags">
        {person.categories.map((c) => (
          <span key={c}>{categoryLabel(c)}</span>
        ))}
      </div>
      <p className="latest-action">
        {records.at(-1)?.kind} · {records.at(-1)?.date}
      </p>
      <FollowButton person={person} state={state} toggle={toggle} />
    </article>
  );
}
function Home({
  data,
  mode,
  setMode,
  state,
  toggle,
  search,
  selected,
}: {
  data: Dataset;
  mode: Mode;
  setMode: (v: Mode) => void;
  state: FollowState;
  toggle: (p: Person) => void;
  search: () => void;
  selected?: string;
}) {
  const people = data.people.filter(
    (p) =>
      p.mode === mode && (!selected || p.categories.includes(selected as any)),
  );
  const lead =
    people.find((p) => p.categories.includes((selected ?? "housing") as any)) ??
    people[0];
  const [visibleCount, setVisibleCount] = useState(12);
  useEffect(() => setVisibleCount(12), [selected, mode]);
  return (
    <>
      <section className="interest-strip">
        <div className="interest-intro">
          <span className="eyebrow">정책은 입구, 중심은 정치인</span>
          <h1>누가, 어떻게 움직였을까?</h1>
        </div>
        <div className="interest-options">
          {categories.slice(0, 3).map((c, i) => (
            <a
              className={`interest-option ${selected === c.id ? "selected" : ""}`}
              href={`#/category/${c.id}?mode=${mode}`}
              key={c.id}
            >
              {i === 0 ? (
                <HouseLine size={25} />
              ) : i === 1 ? (
                <Calculator size={25} />
              ) : (
                <HandHeart size={25} />
              )}
              <span>
                <strong>{c.label}</strong>
                <small>{c.description}</small>
              </span>
            </a>
          ))}
        </div>
      </section>
      <div className="edition-row">
        <div className="mode-switch" role="group" aria-label="자료 선택">
          <button
            aria-pressed={mode === "official"}
            onClick={() => setMode("official")}
          >
            실제 국회 기록
          </button>
          {ENABLE_DEMO && (
            <button
              aria-pressed={mode === "demo"}
              onClick={() => setMode("demo")}
            >
              전체 분석 흐름 시연
            </button>
          )}
        </div>
        <span>
          {mode === "official"
            ? data.collectionMode === "authenticated"
              ? "선택한 의안의 인증 수집 기록"
              : "선택한 공식 기록 · 전체 분석 아님"
            : "인물·정책·기사 모두 가상"}
        </span>
      </div>
      {mode === "official" && !selected && (
        <aside className="reviewed-entry">
          <span className="eyebrow">원문을 대조한 실제 분석</span>
          <h2>박선원·이성권은 함께 발의했고, 윤종오는 반대했다.</h2>
          <p>
            국정원법 한 안건에서 드러난 협력과 견제. 발언·표결에 더해 수정
            조문의 조건까지 확인합니다.
          </p>
          <a className="text-link" href={personHref("VZA76236", "analysis")}>
            실제 분석 읽기 <ArrowRight size={18} />
          </a>
        </aside>
      )}
      <section className="lead-section">
        <div className="section-heading">
          <h2>
            {selected
              ? `${categoryLabel(selected)}에서 움직인 정치인`
              : "말에서 행동으로, 한 사람을 이해하는 일"}
          </h2>
          <button className="text-link" onClick={search}>
            정치인·법안 검색
            <MagnifyingGlass size={18} />
          </button>
        </div>
        {lead ? (
          <div className="lead-grid actor-lead-grid">
            <article className="lead-copy">
              <Label mode={lead.mode} />
              <h3>
                <a href={personHref(lead.id)}>
                  {lead.name},<br />
                  무엇을 말하고
                  <br />
                  어떻게 행동했나.
                </a>
              </h3>
              <p>
                {mode === "official"
                  ? "기사의 인상 대신 공식 기록에서 출발합니다. 누가 법안을 내고, 누가 같은 안건에 찬성했는지 확인하세요."
                  : "보호를 넓히겠다는 발언과 지원 대상을 한정한 법안. 입장이 바뀐 걸까요, 서로 다른 조건을 말한 걸까요?"}
              </p>
              <a className="button primary" href={personHref(lead.id)}>
                정치인 분석 열기
                <ArrowRight size={19} />
              </a>
              <span className="lead-footnote">
                순위나 진정성 점수 대신 연결된 근거
              </span>
            </article>
            <div className="lead-dossier">
              <span className="dossier-heading">정치인 기록부</span>
              <div className="dossier-person">
                <span className="name-seal" aria-hidden="true">
                  {lead.name.slice(-2)}
                </span>
                <div>
                  <strong>{lead.name}</strong>
                  <p>
                    {identityHistory(lead.party)}
                    <br />
                    {identityHistory(lead.region)}
                  </p>
                  <small className="small-note">
                    정당·선거구 조회 이력 포함
                  </small>
                </div>
              </div>
              <div className="dossier-rule" />
              <p className="dossier-question">
                이 사람을 이해하는
                <br />첫 번째 연결 고리
              </p>
              <h4>{data.records.find((r) => r.personId === lead.id)?.title}</h4>
              <dl>
                <div>
                  <dt>행동 근거</dt>
                  <dd>
                    {data.records.filter((r) => r.personId === lead.id).length}
                    개 연결
                  </dd>
                </div>
                <div>
                  <dt>확인 범위</dt>
                  <dd>
                    {mode === "official"
                      ? "선택한 의안의 공식 기록"
                      : "가상 발언·발의·표결"}
                  </dd>
                </div>
                <div>
                  <dt>분석 태도</dt>
                  <dd>사실과 해석을 따로</dd>
                </div>
              </dl>
              <a className="text-link" href={personHref(lead.id, "analysis")}>
                행동에서 읽히는 우선순위
                <ArrowRight size={18} />
              </a>
            </div>
            <aside className="lead-sidebar">
              <h3>
                많은 기사보다,
                <br />
                하나의 맥락.
              </h3>
              <div className="context-mini">
                <span>발언</span>
                <span>발의</span>
                <span>표결</span>
              </div>
              <p>
                같은 보도는 묶고,
                <br />새 사실과 반박은 남깁니다.
              </p>
              <p>
                왜 그렇게 해석했는지,
                <br />
                무엇이 나오면 판단을 바꿀지
                <br />
                함께 보여줍니다.
              </p>
              <a className="text-link" href={personHref(lead.id, "context")}>
                정보 거름망 살펴보기
                <ArrowRight size={18} />
              </a>
            </aside>
          </div>
        ) : (
          <div className="empty-state">
            <h3>
              이 분야의 {mode === "official" ? "확인된 실제" : "가상"} 인물
              기록이 아직 없습니다.
            </h3>
            <p>
              자료가 없다는 뜻이지, 해당 분야에서 활동한 정치인이 없다는 뜻은
              아닙니다.
            </p>
            <a className="button secondary" href={`#/?mode=${mode}`}>
              전체 정치인 보기
            </a>
            {ENABLE_DEMO && (
              <button
                className="button secondary"
                onClick={() => setMode("demo")}
              >
                가상 분석 흐름 보기
              </button>
            )}
          </div>
        )}
      </section>
      <section className="people-section">
        <div className="section-heading">
          <h2>한 사람의 행보를 이어서 보기</h2>
          <span className="section-note">
            인기순이 아닌, 확인한 자료의 순서
          </span>
        </div>
        <div className="people-grid">
          {people.slice(0, visibleCount).map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              data={data}
              state={state}
              toggle={toggle}
            />
          ))}
        </div>
        {visibleCount < people.length && (
          <button
            className="button secondary"
            onClick={() => setVisibleCount((n) => n + 12)}
          >
            정치인 더 보기 · {Math.min(visibleCount, people.length)} /{" "}
            {people.length}명
          </button>
        )}
      </section>
      <div className="editorial-bottom">
        <h2>
          누가 말했는지에서,
          <br />왜 그렇게 움직였는지까지.
        </h2>
        <p>
          알려진 사실은 분명하게. 가능한 해석은 조심스럽게.
          <br />
          내가 선택한 정치인의 변화를 놓치지 않도록.
        </p>
      </div>
    </>
  );
}
function Records({
  person,
  data,
  open,
}: {
  person: Person;
  data: Dataset;
  open: (r: RecordItem) => void;
}) {
  const [filter, setFilter] = useState("전체");
  const records = data.records.filter((r) => r.personId === person.id);
  const rows = records.filter(
    (r) =>
      filter === "전체" ||
      (filter === "발의"
        ? r.kind.includes("발의")
        : filter === "발언"
          ? ["발언", "추가 설명"].includes(r.kind)
          : r.kind === filter),
  );
  return (
    <section>
      <div className="panel-heading">
        <span className="eyebrow">관찰한 사실</span>
        <h2>한마디의 말과, 한 번의 행동.</h2>
        <p>
          같은 법안에 연결된 기록을 따라가세요. 빠진 기록은 추정하지 않습니다.
        </p>
      </div>
      <div className="record-filters" role="group" aria-label="기록 종류">
        {["전체", "발언", "발의", "표결"].map((f) => (
          <button
            aria-pressed={filter === f}
            key={f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {rows.length ? (
        <ol className="evidence-timeline">
          {rows.map((r, i) => (
            <li key={r.id}>
              <span className="timeline-index">{i + 1}</span>
              <div className="timeline-content">
                <div className="evidence-meta">
                  <span className="evidence-type">
                    {r.kind}
                    {r.vote && ` · ${r.vote}`}
                  </span>
                  <time>{r.date}</time>
                </div>
                <h3>{r.title}</h3>
                {r.quote && <blockquote>{r.quote}</blockquote>}
                <p>{r.detail}</p>
                <div className="inline-actions">
                  <button className="text-link" onClick={() => open(r)}>
                    근거 확인
                    <FileText size={17} />
                  </button>
                  <a className="text-link" href={billHref(r.billId)}>
                    이 법안을 함께 움직인 사람들
                    <Users size={17} />
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty-state">
          <FileText size={30} />
          <h3>연결된 {filter} 원자료가 없습니다.</h3>
          <p>
            ‘발언하지 않았다’ 또는 ‘반대했다’는 의미가 아닙니다. 자료 확보
            전에는 이 부분의 판단을 유보합니다.
          </p>
          <a className="text-link" href="#/data">
            자료의 범위와 연결 상태 보기
          </a>
        </div>
      )}
      {person.mode === "official" && (
        <p className="data-notice">
          <Info size={18} />이 화면은 국회 전체 활동의 평가가 아닙니다. 선택한
          의안의 일부 기록만 연결했습니다.
        </p>
      )}
    </section>
  );
}
function Contexts({
  person,
  data,
  headlines,
}: {
  person?: Person;
  data: Dataset;
  headlines: Headline[];
}) {
  const rows = headlines.filter(
    (h) => !person || h.personIds.includes(person.id),
  );
  const groups = clusterHeadlines(rows);
  return (
    <section>
      <div className="panel-heading">
        <span className="eyebrow">정보 거름망</span>
        <h2>
          같은 이야기는 한 번만.
          <br />
          다른 사실은 빠짐없이.
        </h2>
        <p>
          매체가 붙인 해석과 공식 행동 기록을 구분합니다. 원제목은 삭제하지 않고
          펼쳐볼 수 있습니다.
        </p>
      </div>
      {rows.length ? (
        <>
          <div className="context-count">
            <span>
              입력 제목 <strong>{rows.length}</strong>
            </span>
            <ArrowRight size={22} />
            <span>
              검토할 맥락 <strong>{groups.length}</strong>
            </span>
          </div>
          {groups.map((g) => {
            const h = g.items[0],
              bill = data.bills.find((b) => b.id === h.billId);
            const linked =
              g.linked &&
              !!bill &&
              h.personIds.every((id) => data.people.some((p) => p.id === id));
            return (
              <article className="context-group" key={g.id}>
                <div className="evidence-meta">
                  <span className="evidence-label">
                    {h.relation === "correction"
                      ? "정정 보존"
                      : h.relation === "rebuttal"
                        ? "반박 보존"
                        : h.relation === "new"
                          ? "새 사실"
                          : "공통 행동 맥락"}
                  </span>
                  {h.mode === "demo" ? (
                    <Label mode="demo" />
                  ) : (
                    <span className="evidence-label">
                      사용자 제공 제목 · 연결 검토
                    </span>
                  )}
                  <span>{g.items.length}개 제목</span>
                </div>
                <h3>
                  {linked
                    ? `${h.action} · ${bill.title}`
                    : "공식 기록과의 연결 검토가 필요합니다"}
                </h3>
                <p>
                  {linked
                    ? "인물·법안·행동·사건일이 같은 제목을 모았습니다. 이것이 내용의 진실성이나 기자의 의도를 판정한다는 뜻은 아닙니다."
                    : "제목 유사성만으로 다른 사건을 합치지 않습니다. 인물과 법안을 확인하기 전까지 독립 기록으로 보존합니다."}
                </p>
                {linked && (
                  <a className="text-link" href={billHref(bill.id)}>
                    연결된 법안과 참여자 보기
                    <ArrowRight size={17} />
                  </a>
                )}
                <details>
                  <summary>원제목 {g.items.length}개와 출처 펼치기</summary>
                  <ul className="headline-list">
                    {g.items.map((item) => (
                      <li key={item.id}>
                        <strong>{item.title}</strong>
                        <span>
                          {item.publisher} · {formatDate(item.publishedAt)}
                        </span>
                        <External url={item.url}>원문으로 이동</External>
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            );
          })}
        </>
      ) : (
        <div className="empty-state">
          <h3>사용 권한이 확인된 뉴스 제목이 아직 없습니다.</h3>
          <p>
            제목을 임의로 수집하거나, 실제 보도처럼 가상 제목을 섞지 않습니다.
            공식 기록은 ‘말과 행동’에서 확인할 수 있습니다.
          </p>
          <a className="button secondary" href="#/data">
            권한이 있는 제목 가져오기
          </a>
          {ENABLE_DEMO && (
            <a className="text-link" href={personHref("demo-ga", "context")}>
              가상 제목으로 거름망 체험
              <ArrowRight size={17} />
            </a>
          )}
        </div>
      )}
    </section>
  );
}
function Analysis({
  person,
  data,
  open,
}: {
  person: Person;
  data: Dataset;
  open: (r: RecordItem) => void;
}) {
  const records = data.records.filter((r) => r.personId === person.id);
  const rich = person.id === "demo-ga";
  const review = getReviewedAnalysis(person.id, data);
  return (
    <section>
      <div className="panel-heading">
        <span className="eyebrow">근거 기반 해석 · 내심을 확정하지 않음</span>
        <h2>행동에서 읽히는 우선순위.</h2>
        <p>
          ‘속내’를 안다고 말하지 않습니다. 공개 행동으로 설명 가능한 전략과, 그
          설명의 약점을 함께 살펴봅니다.
        </p>
      </div>
      {review ? (
        <>
          <article className="analysis-lead">
            <span className="evidence-label hypothesis">
              분석 가설 · 공식 원문 수동 검토
            </span>
            <h3>{review.heading}</h3>
            <p>{review.hypothesis}</p>
            <div className="inline-actions">
              {review.evidenceIds.map((id) => {
                const record = data.records.find((r) => r.id === id);
                return record ? (
                  <button
                    className="text-link"
                    key={id}
                    onClick={() => open(record)}
                  >
                    {record.kind} 근거 <FileText size={16} />
                  </button>
                ) : null;
              })}
            </div>
          </article>
          <div className="analysis-columns">
            <article>
              <h3>이 해석을 지지하는 근거</h3>
              <p>{review.support}</p>
            </article>
            <article>
              <h3>빠뜨리면 해석이 달라지는 조문</h3>
              <p>{review.counter}</p>
              <External url={reportUrl}>
                수정안 조문 · 심사보고서 인쇄면 23
              </External>
            </article>
          </div>
          <div className="reconsider">
            <h3>다른 설명도 가능합니다</h3>
            <p>{review.alternative}</p>
          </div>
          <div className="reconsider">
            <h3>무엇이 나오면 판단을 바꿀까?</h3>
            <p>{review.reconsider}</p>
          </div>
          <a className="button secondary" href={billHref(reviewedBillId)}>
            같은 법안의 다른 정치인과 찬반 보기 <ArrowRight size={18} />
          </a>
          <p className="data-notice">
            한 안건에 한정한 초기 해석입니다. 장기 성향·내심을 확정하거나 분석
            정확도를 검증한 결과가 아닙니다. 2026-09-06 원문 확인. 9월 3일
            회의록은 임시회의록으로 추후 정정될 수 있습니다.
          </p>
        </>
      ) : rich ? (
        <>
          <article className="analysis-lead">
            <span className="evidence-label hypothesis">
              분석 가설 · 가상 시연
            </span>
            <h3>
              가입 기회는 넓히되,
              <br />
              비용 지원은 선별하려는가?
            </h3>
            <p>
              가입 대상 확대를 말한 뒤, 지원은 소득 기준으로 한정한 법안을 냈고
              선별 배분 재원안에 찬성했습니다. ‘보호 범위 확대’와 ‘재정 부담
              제한’을 함께 추구하는 정책 우선순위로 읽을 수 있습니다.
            </p>
            <div className="inline-actions">
              {["d1", "d2", "d4"].map((id) => (
                <button
                  key={id}
                  className="text-link"
                  onClick={() => open(data.records.find((r) => r.id === id)!)}
                >
                  {data.records.find((r) => r.id === id)?.kind} 근거
                  <FileText size={16} />
                </button>
              ))}
            </div>
          </article>
          <div className="analysis-columns">
            <article>
              <h3>이 해석을 지지하는 근거</h3>
              <p>
                법안의 가입 확대 조항과 지원 대상 제한이 동시에 존재합니다. 별도
                재원안 찬성 기록도 비용을 선별 배분하는 방향과 연결됩니다.
              </p>
            </article>
            <article>
              <h3>반대 근거와 다른 설명</h3>
              <p>
                9월 1일 설명은 가입과 지원을 처음부터 구분합니다. 입장 번복이
                아니라 원래 설계였을 수 있습니다. 당론·위원회 협상·한시적 예산
                제약도 대안 설명입니다.
              </p>
              <button
                className="text-link"
                onClick={() => open(data.records.find((r) => r.id === "d7")!)}
              >
                추가 설명 확인
                <FileText size={16} />
              </button>
            </article>
          </div>
          <div className="reconsider">
            <h3>무엇이 나오면 판단을 바꿀까?</h3>
            <p>
              소득 제한을 없애는 수정안, 보편 지원 재원안의 대표발의, 또는 해당
              조건과 충돌하는 후속 표결이 확인되면 이 가설을 다시 검토합니다.
            </p>
          </div>
          <p className="data-notice">
            행동 3건과 추가 설명 1건을 연결한 가상 분석입니다. 진정성 점수·숨은
            이해관계·선거 의도를 증명하지 않습니다.
          </p>
        </>
      ) : (
        <>
          <article className="analysis-lead">
            <span className="evidence-label hypothesis">
              해석 보류 · 관찰 범위 제한
            </span>
            <h3>
              {records.some((r) => r.kind === "대표발의")
                ? "대표발의라는 참여는 확인했습니다. 정책 방향의 일관성은 아직 판단할 수 없습니다."
                : records.some((r) => r.kind === "표결")
                  ? "해당 안건의 찬반은 확인했습니다. 그 이유나 다른 정책 입장까지 알 수는 없습니다."
                  : "정책 참여 기록과 전략적 의도는 같은 것이 아닙니다."}
            </h3>
            <p>
              현재 연결 기록 {records.length}개만으로 장기 우선순위나 ‘숨은
              목적’을 확정할 수 없습니다. 발언 전문과 법안 조항, 다른 시기의
              행동이 더 필요합니다.
            </p>
          </article>
          <div className="analysis-columns">
            <article>
              <h3>가능한 설명</h3>
              <p>
                개인의 정책 선호, 당론, 소관 위원회 활동, 협상 결과 등이 모두
                가능한 설명입니다. 현재 자료로 어느 설명이 맞는지 가릴 수
                없습니다.
              </p>
            </article>
            <article>
              <h3>다음으로 확인할 근거</h3>
              <p>
                같은 정책에 관한 발언 원문과 법안의 제안 이유·세부 조항을 연결한
                뒤, 동일 조건의 후속 표결과 비교합니다.
              </p>
              <External url={person.sourceUrl}>
                인물 식별에 사용한 공식 자료
              </External>
            </article>
          </div>
          <a
            className="button secondary"
            href={personHref("VZA76236", "analysis")}
          >
            원문을 대조한 실제 분석 사례 보기
            <ArrowRight size={18} />
          </a>
        </>
      )}
    </section>
  );
}
function Scenario({ bill, data }: { bill?: Bill; data: Dataset }) {
  const official = !!bill && bill.mode === "official";
  const actual = bill?.vote;
  const [extra, setExtra] = useState(0);
  const [withdraw, setWithdraw] = useState(0);
  const base = actual
    ? {
        members: actual.members,
        present: actual.voted,
        yes: actual.yes,
        no: actual.no,
        abstain: actual.abstain,
        unknown: 0,
      }
    : { members: 300, present: 270, yes: 120, no: 90, abstain: 0, unknown: 60 };
  const scenario = calculateScenario({
    ...base,
    switchToYes: 0,
    switchFromYes: withdraw,
    unknownToYes: extra,
  });
  return (
    <section>
      <div className="panel-heading">
        <span className="eyebrow">조건부 전망 · 확률 예언 아님</span>
        <h2>
          무엇이 바뀌면,
          <br />
          구도가 달라질까?
        </h2>
        <p>
          이미 일어난 표결과 앞으로의 전망을 구분합니다. 기사량이나 공동발의
          수를 찬성표 수로 바꾸지 않습니다.
        </p>
      </div>
      {bill && (
        <div className="scenario-target">
          <span>
            {bill.number} · {bill.stage}
          </span>
          <h3>
            <a href={billHref(bill.id)}>{bill.title}</a>
          </h3>
        </div>
      )}
      {bill?.id === reviewedBillId &&
      getReviewedAnalysis("VZA76236", data) &&
      getReviewedAnalysis("3TP65086", data) ? (
        <>
          <div className="scenario-path">
            <article>
              <span className="evidence-label">현재 확인 · 안건별 관계</span>
              <h3>공동 발의와 반대 축이 갈립니다</h3>
              <p>
                <a href={personHref("VZA76236", "analysis")}>박선원</a>과{" "}
                <a href={personHref("WXJ8352N")}>이성권</a>은 공동 대표발의 후
                찬성했습니다.{" "}
                <a href={personHref("3TP65086", "analysis")}>윤종오</a>는 통제
                문제를 제기하고 반대했습니다. 정당 전체의 연합·분열을 뜻하지
                않습니다.
              </p>
            </article>
            <article>
              <span className="evidence-label hypothesis">조건부 전망</span>
              <h3>다음 쟁점은 권한의 경계일 수 있습니다</h3>
              <p>
                공포·시행으로 이어진다면 경제안보의 대통령령상 범위와 사이버
                활동의 ‘상당한 이유’ 판단이 구체적인 쟁점이 될 수 있습니다.
                범위가 넓게 제시되면 윤종오가 제기한 통제 논점이 다시 부각될
                가능성이 있습니다.
              </p>
            </article>
            <article>
              <span className="evidence-label">반증 가능한 관찰 신호</span>
              <h3>협력은 후속 행동으로 검증합니다</h3>
              <p>
                박선원·이성권의 후속 감독 법안 참여, 윤종오의 보완안 제출·표결,
                대통령령 입법예고를 확인합니다. 통제 강화안에서 협력한다면 현재
                찬반 축이 재편될 수 있습니다. 실제 협력 약속은 확인하지
                못했습니다.
              </p>
            </article>
          </div>
          <p className="data-notice">
            수정안 부칙은 공포 후 3개월 시행입니다.{" "}
            {bill.promulgatedDate
              ? `공식 API의 공포일은 ${bill.promulgatedDate}입니다. 시행 여부는 후속 법령 원문을 확인해야 합니다. `
              : "현재 스냅샷에서는 공포를 확인하지 못했으므로 시행 중이라고 표시하지 않습니다. "}
            아래는 이미 끝난 표결의 조건 계산이며 위 전망의 확률이 아닙니다.
          </p>
          <External url={reportUrl}>수정 조문과 부칙</External>{" "}
          <External url={minutesUrl}>본회의 발언·표결</External>
        </>
      ) : (
        <div className="scenario-path">
          <article>
            <span className="evidence-label">현재 확인</span>
            <h3>{actual ? "이 안건의 찬반 기록" : "발의 단계의 참여 관계"}</h3>
            <p>
              {actual
                ? `이 안건에 찬성 ${actual.yes}명, 반대 ${actual.no}명, 기권 ${actual.abstain}명입니다. 다음 안건에도 같은 구도가 유지된다는 뜻은 아닙니다.`
                : "대표·공동발의 참여는 정책 협력의 단서입니다. 심사 과정의 수정과 실제 표결은 별도로 확인해야 합니다."}
            </p>
          </article>
          <article>
            <span className="evidence-label hypothesis">조건부 전망</span>
            <h3>
              {actual
                ? "후속 법안에서 협력이 유지된다면"
                : "수정안에서 지원 범위가 바뀐다면"}
            </h3>
            <p>
              {actual
                ? "해당 정책의 후속 논의에서 협력의 출발점이 될 수 있습니다. 다만 하나의 안건만으로 정당 간 연합이 형성되었다고 결론 내릴 수 없습니다."
                : "지원 범위를 넓히면 확대를 요구한 인물과의 협력이 가능해지는 동시에, 재원 조건을 요구한 인물과 추가 협상이 필요할 수 있습니다."}
            </p>
          </article>
          <article>
            <span className="evidence-label">전망을 바꿀 신호</span>
            <h3>같은 조건의 후속 행동</h3>
            <p>
              수정안 참여 명단, 위원회 처리, 공개 입장 변경, 후속 표결이 나오면
              다시 비교합니다. 지지율·의석 변화는 별도 검증 없이 예측하지
              않습니다.
            </p>
          </article>
        </div>
      )}
      {!actual && official && (
        <p className="data-notice">
          이 법안의 확정 표결 자료를 확보하지 못했습니다. 임의의 수치로 표결
          계산을 제공하지 않습니다.
        </p>
      )}
      {(!official || actual) && (
        <div className="scenario-calculator">
          <h3>
            {actual
              ? "같은 출석 인원에서 찬성표가 달랐다면?"
              : "찬성 확보에 따라 달라지는 의결 조건"}
          </h3>
          <p>
            {actual
              ? "과거 표결에 대한 반사실 계산입니다. 미래 예측이 아닙니다."
              : "가상 일반 법률안: 재적 300명, 출석 270명, 찬성 120명·반대 90명·미정 60명. 실제 여론·의석 조사값이 아닙니다."}
          </p>
          <div className="scenario-controls">
            {!actual && (
              <label htmlFor="extra-votes">
                미정 중 찬성 확보 <strong>{extra}명</strong>
                <input
                  id="extra-votes"
                  type="range"
                  min="0"
                  max={base.unknown}
                  value={extra}
                  onChange={(e) => setExtra(Number(e.target.value))}
                />
              </label>
            )}
            <label htmlFor="lost-votes">
              기존 찬성 중 이탈 <strong>{withdraw}명</strong>
              <input
                id="lost-votes"
                type="range"
                min="0"
                max={base.yes}
                value={withdraw}
                onChange={(e) => setWithdraw(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="scenario-result" aria-live="polite">
            {scenario.valid ? (
              <>
                <span>일반 의결 기준: 출석 과반수 {scenario.threshold}명</span>
                <strong>{scenario.outcome}</strong>
                <p>
                  이 조건의 찬성 {scenario.yes}명 · 추가 필요 {scenario.needed}
                  명
                  {scenario.unknown > 0 && ` · 아직 미정 ${scenario.unknown}명`}
                </p>
              </>
            ) : (
              scenario.reason
            )}
          </div>
          <p className="small-note">
            일반 법률안의 재적 과반 출석·출석 과반 찬성 계산만 적용합니다. 특별
            의결정족수 안건, 예측 확률, 정책의 인과 효과는 포함하지 않습니다.
          </p>
          <External url="https://www.law.go.kr/법령/대한민국헌법/제49조">
            일반 의결 기준 근거
          </External>
        </div>
      )}
    </section>
  );
}
function Profile({
  person,
  data,
  state,
  toggle,
  tab,
  open,
  headlines,
}: {
  person: Person;
  data: Dataset;
  state: FollowState;
  toggle: (p: Person) => void;
  tab: string;
  open: (r: RecordItem) => void;
  headlines: Headline[];
}) {
  const active = tabs.some((t) => t.id === tab) ? tab : "records";
  const related =
    (getReviewedAnalysis(person.id, data) &&
      data.records.find(
        (r) => r.personId === person.id && r.billId === reviewedBillId,
      )) ||
    data.records.find((r) => r.personId === person.id);
  const bill = data.bills.find((b) => b.id === related?.billId);
  return (
    <>
      <nav className="breadcrumb" aria-label="현재 위치">
        <a href="#/">정치인 탐색</a>
        <span>/</span>
        <span>{person.name}</span>
      </nav>
      <div className="actor-layout">
        <article className="actor-main">
          <header className="actor-header">
            <Label mode={person.mode} />
            <h1>{person.name}</h1>
            <p>
              {identityHistory(person.party)} · {identityHistory(person.region)}
            </p>
            <p className="small-note">
              공식 인물 조회 이력입니다. 현재 소속이나 표결 당시 정당과 다를 수
              있습니다.
            </p>
            <span>{person.committee}</span>
            <div className="profile-mobile-follow">
              <FollowButton person={person} state={state} toggle={toggle} />
            </div>
          </header>
          <nav className="actor-tabs" aria-label="정치인 분석 항목">
            {tabs.map((t) => (
              <a
                key={t.id}
                href={personHref(person.id, t.id)}
                aria-current={active === t.id ? "page" : undefined}
              >
                {t.label}
              </a>
            ))}
          </nav>
          <div className="actor-panel">
            {active === "records" && (
              <Records person={person} data={data} open={open} />
            )}{" "}
            {active === "context" && (
              <Contexts person={person} data={data} headlines={headlines} />
            )}{" "}
            {active === "analysis" && (
              <Analysis person={person} data={data} open={open} />
            )}{" "}
            {active === "scenario" && (
              <Scenario key={bill?.id} bill={bill} data={data} />
            )}
          </div>
        </article>
        <aside className="actor-rail">
          <div>
            <BookmarkSimple size={28} />
            <h2>
              뉴스는 지나가도,
              <br />
              행보는 이어집니다.
            </h2>
            <p>
              이 사람을 추적하고
              <br />
              새로 확인된 근거와 변경점을
              <br />
              다음 방문에서 확인하세요.
            </p>
            <FollowButton person={person} state={state} toggle={toggle} />
            <span className="local-save-note">
              팔로우는 이 브라우저에만 저장
            </span>
            <a className="text-link" href="#/following">
              내가 추적하는 정치인
              <ArrowRight size={18} />
            </a>
            <hr />
            <h3>판단의 세 층위</h3>
            <dl className="truth-key">
              <dt>사실</dt>
              <dd>공식 원자료로 확인한 기록</dd>
              <dt>해석</dt>
              <dd>반대 근거로 수정 가능한 가설</dd>
              <dt>전망</dt>
              <dd>조건이 성립할 때의 시나리오</dd>
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
function BillPage({
  bill,
  data,
  open,
}: {
  bill: Bill;
  data: Dataset;
  open: (r: RecordItem) => void;
}) {
  const records = data.records.filter((r) => r.billId === bill.id);
  const sponsors = records.filter((r) => r.kind.includes("발의"));
  const votes = records.filter((r) => r.kind === "표결");
  return (
    <section className="bill-page">
      <nav className="breadcrumb">
        <a href="#/">정치인 탐색</a>
        <span>/ 법안 연결</span>
      </nav>
      <header className="article-header">
        <Label mode={bill.mode} />
        <h1>{bill.title}</h1>
        <p>
          의안 {bill.number} · {bill.date} · {bill.stage}
        </p>
        <External url={bill.sourceUrl}>공식 의안 상세</External>
      </header>
      <div className="section-heading">
        <h2>누가 발의했나</h2>
        <span>{bill.proposer}</span>
      </div>
      {sponsors.length ? (
        <>
          <div className="people-links">
            {sponsors.map((r) => (
              <a href={personHref(r.personId)} key={r.id}>
                <span>{r.kind}</span>
                <strong>
                  {data.people.find((p) => p.id === r.personId)?.name}
                </strong>
                <ArrowUpRight size={18} />
              </a>
            ))}
          </div>
          <p className="small-note">
            확인 명단 {bill.sponsorsReturned ?? sponsors.length} /{" "}
            {bill.sponsorsTotal ?? sponsors.length}명. 공동발의는 표결 찬성이
            아닙니다.
          </p>
        </>
      ) : (
        <p className="data-notice">
          제출자: {bill.proposer}. 대안 법안의 원안 발의자 관계는 아직 연결하지
          않았습니다. 위원장 제출안을 특정 의원 개인의 성과로 자동 귀속하지
          않습니다.
        </p>
      )}
      <div className="section-heading">
        <h2>누가 찬성·반대했나</h2>
      </div>
      {bill.vote ? (
        <>
          <div className="vote-totals">
            <div>
              <span>찬성</span>
              <strong>{bill.vote.yes}</strong>
            </div>
            <div>
              <span>반대</span>
              <strong>{bill.vote.no}</strong>
            </div>
            <div>
              <span>기권</span>
              <strong>{bill.vote.abstain}</strong>
            </div>
            <div>
              <span>투표</span>
              <strong>{bill.vote.voted}</strong>
            </div>
          </div>
          <p className="small-note">
            {bill.vote.date} 합계. 아래 개인 기록은 {bill.vote.rowsReturned} /{" "}
            {bill.vote.rowsTotal}행을 연결했습니다.{" "}
            {bill.vote.rowNote ??
              "개인 API 총 행 수는 실제 투표 인원과 다른 모수입니다."}
          </p>
          <div className="vote-table-wrap">
            <table className="vote-table">
              <caption>확인한 개인별 표결 기록</caption>
              <thead>
                <tr>
                  <th>정치인</th>
                  <th>당시 정당</th>
                  <th>표결</th>
                  <th>근거</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((r) => (
                  <tr key={r.id}>
                    <th>
                      <a href={personHref(r.personId)}>
                        {data.people.find((p) => p.id === r.personId)?.name}
                      </a>
                    </th>
                    <td>
                      {r.partyAtEvent ??
                        (r.mode === "demo" ? "가상" : "미확인")}
                    </td>
                    <td>{r.vote}</td>
                    <td>
                      <button className="text-link" onClick={() => open(r)}>
                        확인
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h3>연결된 표결 기록이 없습니다.</h3>
          <p>
            찬반은 미확인입니다. 발의자 수를 확보된 찬성표로 표시하지 않습니다.
          </p>
        </div>
      )}
      <Scenario key={bill.id} bill={bill} data={data} />
    </section>
  );
}
function Following({
  data,
  state,
  setState,
  toggle,
  addDemo,
}: {
  data: Dataset;
  state: FollowState;
  setState: (s: FollowState) => void;
  toggle: (p: Person) => void;
  addDemo: () => void;
}) {
  const people = data.people.filter((p) => state.people[p.id]);
  const [exported, setExported] = useState(false);
  const exportBundle = () => {
    const payload = {
      title: "판단 · 추적 중인 정치인의 근거 묶음",
      exportedAt: new Date().toISOString(),
      scope: ENABLE_DEMO
        ? "공식 기록과 가상 시연을 포함할 수 있습니다. mode를 확인하세요."
        : "선택한 정치인의 공식 기록입니다. 전체 경력 분석이 아닙니다.",
      officialScope: data.scope,
      demoScope: ENABLE_DEMO ? demo.scope : undefined,
      sources: data.sources,
      people: people.map((p) => ({
        person: p,
        records: data.records.filter((r) => r.personId === p.id),
      })),
      limits: "사실 원장 내보내기. 분석 가설이나 전망의 검증을 의미하지 않음.",
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "pandan-evidence.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
  };
  return (
    <section className="following-page">
      <header className="following-heading">
        <span className="eyebrow">선택한 사람, 이어지는 기록</span>
        <h1>내가 추적하는 정치인</h1>
        <p>
          확인한 시점 이후의 새 기록과 변경을 구분합니다. 자동 푸시·메일 발송은
          하지 않습니다.
        </p>
      </header>
      {people.length ? (
        <>
          <div className="inline-actions">
            <button className="button secondary" onClick={exportBundle}>
              <DownloadSimple size={19} />
              근거 묶음 내려받기
            </button>
            {people.some((p) => p.mode === "demo") && (
              <button className="button secondary" onClick={addDemo}>
                가상 후속 기록 추가 시연
              </button>
            )}
          </div>
          {exported && (
            <p role="status">
              근거 묶음을 내려받았습니다. 가상/공식 표시와 출처를 함께
              보존했습니다.
            </p>
          )}
          {people.map((p) => {
            const changes = recordChanges(state, p.id, data.records);
            return (
              <article className="follow-row" key={p.id}>
                <div>
                  <Label mode={p.mode} />
                  <h2>
                    <a href={personHref(p.id)}>{p.name}</a>
                  </h2>
                  <p>
                    {p.party} · {p.region}
                  </p>
                  <FollowButton person={p} state={state} toggle={toggle} />
                </div>
                <div>
                  <h3>
                    {changes.length
                      ? `${changes.length}개의 새 기록·변경`
                      : "마지막 확인 이후 추가된 기록 없음"}
                  </h3>
                  {changes.length ? (
                    <>
                      <ul>
                        {changes.map((c) => (
                          <li key={c.record.id}>
                            <span>{c.type}</span>
                            <a href={personHref(p.id)}>
                              {c.record.date} · {c.record.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                      <button
                        className="text-link"
                        onClick={() =>
                          setState(markRead(state, p.id, data.records))
                        }
                      >
                        이 기록까지 확인했어요
                        <Check size={18} />
                      </button>
                    </>
                  ) : (
                    <p>
                      데이터 갱신 시 비교됩니다. ‘변화 없음’은 이 서비스가
                      확인한 범위에 한정됩니다.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </>
      ) : (
        <div className="empty-state">
          <BookmarkSimple size={38} />
          <h2>한 사람의 행보부터 담아보세요.</h2>
          <p>프로필에서 ‘이 정치인 추적하기’를 누르면 여기에 모입니다.</p>
          <a className="button primary" href="#/">
            정치인 둘러보기
            <ArrowRight size={18} />
          </a>
        </div>
      )}
      <p className="data-notice">
        기존 ‘저장한 이슈’ 데이터는 지우지 않았습니다. 인물 추적은 별도 저장
        공간을 사용합니다. 브라우저 데이터를 지우면 팔로우도 사라집니다.
      </p>
    </section>
  );
}
function DataPage({
  data,
  reload,
  error,
  onImport,
  headlines,
}: {
  data: Dataset;
  reload: () => void;
  error: string;
  onImport: (h: Headline[]) => void;
  headlines: Headline[];
}) {
  const [text, setText] = useState("");
  const [rights, setRights] = useState(false);
  const [status, setStatus] = useState("");
  const imported = headlines;
  return (
    <section className="data-page">
      <header className="following-heading">
        <h1>자료의 범위와 연결 상태</h1>
        <p>무엇을 확인했는지 만큼, 무엇을 아직 모르는지도 공개합니다.</p>
      </header>
      <div className="data-status-grid">
        <article>
          <h2>국회 공식 기록</h2>
          <p>{data.scope}</p>
          <p>스냅샷 확인: {formatDate(data.recordedAt)}</p>
          <button className="button secondary" onClick={reload}>
            <ArrowsClockwise size={18} />
            최신 저장본 다시 읽기
          </button>
          <p className="small-note">
            이 버튼은 서버에 저장된 자료를 다시 읽습니다. 국회에서 새 자료를
            수집하는 작업과는 다릅니다.
          </p>
          {error && <p role="alert">{error}</p>}
        </article>
        <article>
          <h2>뉴스 제목</h2>
          <p>
            권한이 확인되지 않은 매체·검색 결과는 자동 수집하지 않습니다. 현재는
            사용자가 이용권한을 확인해 가져온 자료만 처리합니다.
          </p>
          <External url="https://help.naver.com/service/30015/contents/17128?lang=ko&osType=COMMONOS">
            NAVER API 저장·가공 안내
          </External>
          <External url="https://www.newstore.or.kr/store/prodct/license-news-search/license-api-list.do">
            뉴스토어 계약형 공급 경로
          </External>
        </article>
      </div>
      <details className="source-register">
        <summary>공식 자료·수집 근거 {data.sources.length}개</summary>
        {data.sources.map((s) => (
          <p key={s.id}>
            <External url={s.url}>
              {s.service} · {s.returned}/{s.total}행
            </External>
            <span>{new Date(s.recordedAt).toLocaleString("ko-KR")}</span>
          </p>
        ))}
      </details>
      <section className="headline-import">
        <h2>권한이 있는 뉴스 제목 가져오기</h2>
        <p>
          이 브라우저의 현재 방문에서만 처리합니다. 외부 AI·서버로 보내거나 영구
          저장하지 않습니다. 제목만으로 발언 전문이나 정치인의 의도를 만들어내지
          않습니다.
        </p>
        <details>
          <summary>입력 형식과 연결 기준 보기</summary>
          <pre>
            {JSON.stringify(
              [
                {
                  id: "news-1",
                  title: "제목",
                  publisher: "매체명",
                  url: "https://example.org/article",
                  publishedAt: "2026-09-05T10:00:00+09:00",
                  personIds: ["1JI2689F"],
                  billId: "PRC_E2E6C0B8B2A1A0W9X3V2U0U4S6T9B2",
                  action: "발의",
                  eventDate: "2026-09-04",
                  relation: "report",
                  verifiedLink: false,
                },
              ],
              null,
              2,
            )}
          </pre>
          <p>
            verifiedLink는 사람이 인물·법안·행동일 연결을 검토했을 때만 true로
            입력하세요. correction(정정), rebuttal(반박), new(새 사실)는 별도
            맥락으로 보존합니다. 입력값의 연결 정확도를 자동 검증했다고 표시하지
            않습니다.
          </p>
        </details>
        <label htmlFor="headline-json">제목 묶음 JSON (최대 200개)</label>
        <textarea
          id="headline-json"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          maxLength={200001}
          placeholder="이용 권한이 확인된 제목 데이터를 붙여넣으세요"
        />
        <label className="rights-check">
          <input
            type="checkbox"
            checked={rights}
            onChange={(e) => setRights(e.target.checked)}
          />
          이 자료의 제목 저장·가공 권한을 확인했습니다. 기사 본문이나 비밀값은
          포함하지 않았습니다.
        </label>
        <button
          className="button primary"
          onClick={() => {
            try {
              const rows = parseHeadlines(text, rights);
              if (!ENABLE_DEMO && rows.some((r) => r.mode !== "official"))
                throw new Error(
                  "기본 화면에는 실제 보도만 가져올 수 있습니다.",
                );
              onImport(rows);
              setStatus(`${rows.length}개 제목을 현재 방문에 불러왔습니다.`);
            } catch (e) {
              setStatus((e as Error).message);
            }
          }}
        >
          제목 맥락 정리하기
          <ArrowRight size={18} />
        </button>
        <p role="status">{status}</p>
      </section>
      {imported.length > 0 && <Contexts data={data} headlines={imported} />}
      <section className="product-principles">
        <h2>우리가 비용을 받으려는 가치는</h2>
        <p>
          사실을 가리는 것이 아니라, 반복 조사 시간을 줄이는 것입니다. 원문·공적
          사실은 기본 제공하고, 복수 인물 추적·변화 이력·근거 묶음의 업무 가치를
          유료 가설로 검증합니다. 현재 결제나 요금제는 없습니다.
        </p>
        <p>
          정보 정확도·맥락 과병합·정정 누락·근거 확인 시간·재방문·지불 의향을
          각각 검증하기 전까지 ‘중립적 분석 완료’나 ‘예측 정확도’를 수치로
          홍보하지 않습니다.
        </p>
      </section>
    </section>
  );
}
function Search({ data, close }: { data: Dataset; close: () => void }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLocaleLowerCase();
  const people = data.people.filter((p) =>
    [p.name, p.party, p.region, ...p.categories.map(categoryLabel)]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query),
  );
  const bills = data.bills.filter((b) =>
    [b.title, b.number, b.proposer]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query),
  );
  return (
    <Dialog title="정치인 또는 법안 찾기" close={close}>
      <label className="search-field">
        <MagnifyingGlass size={24} />
        <span className="sr-only">정치인·법안 검색어</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="정치인 이름, 정책, 의안번호"
          maxLength={80}
        />
      </label>
      <p className="search-hint">
        현재 연결된 자료에서만 검색합니다. 정치인은 한 번에 최대 20명
        표시합니다. 이름·지역으로 범위를 좁혀보세요.
      </p>
      <div role="status">
        정치인 {people.length}명 · 법안 {bills.length}개
      </div>
      {!people.length && !bills.length && (
        <div className="empty-state">
          <h3>연결된 기록을 찾지 못했습니다.</h3>
          <p>이름이나 의안번호로 다시 검색해주세요.</p>
          <button className="button secondary" onClick={() => setQ("")}>
            검색어 지우기
          </button>
        </div>
      )}
      <ul className="search-results">
        {people.slice(0, 20).map((p) => (
          <li key={p.id}>
            <a href={personHref(p.id)} onClick={close}>
              <Label mode={p.mode} />
              <strong>{p.name}</strong>
              <span>{p.region}</span>
            </a>
          </li>
        ))}
        {bills.map((b) => (
          <li key={b.id}>
            <a href={billHref(b.id)} onClick={close}>
              <Label mode={b.mode} />
              <strong>{b.title}</strong>
            </a>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
export default function PoliticianApp() {
  const [official, setOfficial] = useState<Dataset>(empty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hash, setHash] = useState(location.hash);
  const route = parsePoliticalRoute(hash);
  const [state, updateState] = useState<FollowState>(() => {
    try {
      return readFollows(localStorage);
    } catch {
      return { version: 1, people: {} };
    }
  });
  const [storageError, setStorageError] = useState(false);
  const [modal, setModal] = useState<"search" | RecordItem | null>(null);
  const [toast, setToast] = useState("");
  const [imported, setImported] = useState<Headline[]>([]);
  const [added, setAdded] = useState(false);
  const main = useRef<HTMLElement>(null);
  const request = useRef(0);
  const data: Dataset = {
    ...official,
    people: [...official.people, ...(ENABLE_DEMO ? demo.people : [])],
    bills: [...official.bills, ...(ENABLE_DEMO ? demo.bills : [])],
    records: [
      ...official.records,
      ...(ENABLE_DEMO ? demo.records : []),
      ...(ENABLE_DEMO && added
        ? [
            {
              id: "d9",
              personId: "demo-ga",
              billId: "demo-rent",
              kind: "추가 설명",
              date: "2026-09-05",
              title: "가상 후속 기록: 지원 범위 재검토",
              detail:
                "변화 추적 기능을 확인하기 위해 추가한 가상 기록입니다. 실제 자료가 아닙니다.",
              mode: "demo" as const,
            },
          ]
        : []),
    ],
  };
  const load = async () => {
    const id = ++request.current;
    setLoading(true);
    try {
      const response = await fetch("/data/assembly.json", {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      if (!validateDataset(payload, "official")) throw new Error();
      if (id === request.current) {
        setOfficial(withReviewed(payload));
        setError("");
      }
    } catch {
      if (id === request.current)
        setError(
          "공식 자료를 불러오지 못했습니다. 마지막으로 불러온 기록은 보존했습니다. 연결을 확인한 뒤 다시 시도해주세요.",
        );
    } finally {
      if (id === request.current) setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    return () => {
      request.current++;
    };
  }, []);
  useEffect(() => {
    const onHash = () => {
      setHash(location.hash);
      setModal(null);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [hash]);
  const person = data.people.find((p) => p.id === route.id);
  const bill = data.bills.find((b) => b.id === route.id);
  useEffect(() => {
    document.title = person
      ? `${person.name} · 정치인 분석 · 판단`
      : bill
        ? `${bill.title} · 판단`
        : "정치인의 말과 행동을 잇다 · 판단";
  }, [person?.name, bill?.title]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const persist = (next: FollowState) => {
    updateState(next);
    try {
      localStorage.setItem(FOLLOW_KEY, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };
  const toggle = (p: Person) => {
    const people = { ...state.people };
    if (people[p.id]) {
      delete people[p.id];
      setToast(`${p.name} 추적을 해제했습니다.`);
    } else {
      people[p.id] = {
        followedAt: new Date().toISOString(),
        seen: Object.fromEntries(
          data.records
            .filter((r) => r.personId === p.id)
            .map((r) => [r.id, fingerprint(r)]),
        ),
      };
      setToast(`${p.name}의 행보를 추적합니다.`);
    }
    persist({ version: 1, people });
  };
  const setMode = (mode: Mode) => {
    location.hash =
      route.page === "category"
        ? `#/category/${route.id}?mode=${mode}`
        : `#/?mode=${mode}`;
  };
  const headlines = [...(ENABLE_DEMO ? demoHeadlines : []), ...imported];
  const mode = ENABLE_DEMO
    ? (person?.mode ?? bill?.mode ?? route.mode)
    : "official";
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        본문 바로가기
      </a>
      <div className="prototype-banner">
        프로토타입 ·{" "}
        {mode === "official"
          ? official.collectionMode === "authenticated"
            ? "국회 인증 자료를 연결했습니다. 선택한 의안의 기록이며 전체 분석은 아닙니다."
            : "선택한 공식 기록을 연결합니다. 전체 분석이 아닙니다."
          : "현재 인물·정책·기사·분석은 모두 가상 시연입니다."}
        <a href="#/data">자료 안내</a>
      </div>
      <header className="site-header">
        <div className="container">
          <div className="masthead-wrap">
            <div className="masthead-tagline">
              <span>정치인의 말과 행동을 잇다</span>
              <small>사실에서 맥락으로, 맥락에서 판단으로</small>
            </div>
            <a className="wordmark" href="#/">
              판단<span>정치인을 이해하는 새로운 읽기</span>
            </a>
            <div className="masthead-actions">
              <button
                className="header-control"
                onClick={() => setModal("search")}
              >
                <MagnifyingGlass size={20} />
                검색
              </button>
              <a className="header-control" href="#/following">
                <BookmarkSimple size={20} />내 추적{" "}
                <span className="saved-count">
                  {data.people.filter((p) => state.people[p.id]).length}
                </span>
              </a>
            </div>
          </div>
          <nav className="primary-nav" aria-label="주 메뉴">
            <div className="nav-categories">
              <a
                href="#/"
                aria-current={
                  ["home", "category"].includes(route.page) ? "page" : undefined
                }
              >
                정치인 탐색
              </a>
              <a href={personHref("VZA76236", "analysis")}>실제 분석</a>
              <a
                href="#/following"
                aria-current={route.page === "following" ? "page" : undefined}
              >
                행보 추적
              </a>
            </div>
            <a className="editorial-policy" href="#/data">
              근거와 편집 원칙
              <Info size={16} />
            </a>
          </nav>
        </div>
      </header>
      <main className="container" id="main-content" tabIndex={-1} ref={main}>
        {storageError && (
          <p className="data-notice" role="alert">
            브라우저 저장이 차단되어 이번 방문 동안만 팔로우를 유지합니다.
          </p>
        )}
        {loading && (
          <p role="status" className="load-status">
            공식 기록을 확인하고 있습니다.
          </p>
        )}
        {error && (
          <div className="data-notice" role="alert">
            <span>{error}</span>
            <button className="text-link" onClick={() => void load()}>
              다시 시도
            </button>
          </div>
        )}
        {["home", "category"].includes(route.page) ? (
          <Home
            data={data}
            mode={mode}
            setMode={setMode}
            state={state}
            toggle={toggle}
            search={() => setModal("search")}
            selected={route.page === "category" ? route.id : undefined}
          />
        ) : route.page === "politician" && person ? (
          <Profile
            person={person}
            data={data}
            state={state}
            toggle={toggle}
            tab={route.tab}
            open={setModal}
            headlines={headlines}
          />
        ) : route.page === "bill" && bill ? (
          <BillPage bill={bill} data={data} open={setModal} />
        ) : route.page === "following" ? (
          <Following
            data={data}
            state={state}
            setState={persist}
            toggle={toggle}
            addDemo={() => {
              setAdded(true);
              setToast(
                "가상 후속 기록을 추가했습니다. 새 기록 표시를 확인하세요.",
              );
            }}
          />
        ) : route.page === "data" ? (
          <DataPage
            data={data}
            reload={() => void load()}
            error={error}
            onImport={setImported}
            headlines={imported}
          />
        ) : (
          !loading && (
            <div className="empty-state">
              <h1>이 기록으로 연결할 수 없습니다.</h1>
              <p>
                {route.page === "briefing"
                  ? "이전 이슈 중심 화면은 정치인 중심으로 개편했습니다. 저장한 이슈 데이터는 삭제하지 않았습니다."
                  : "주소가 잘못되었거나 현재 자료 범위에 없는 인물·법안입니다."}
              </p>
              <a className="button primary" href="#/">
                정치인 탐색으로 돌아가기
              </a>
            </div>
          )
        )}
      </main>
      <footer className="site-footer container">
        <a href="#/">판단</a>
        <p>정치인의 행보를 지속 추적하고, 스스로 판단할 근거를 제공합니다.</p>
        <span>
          사실 · 분석 가설 · 조건부 전망 구분 / 정치 성향 설문·인기 순위 없음
        </span>
        <a className="text-link" href="#/data">
          데이터와 수익 모델의 검증 범위
        </a>
      </footer>
      <nav className="mobile-nav" aria-label="빠른 메뉴">
        <a href="#/">
          <Users size={22} />
          정치인
        </a>
        <button onClick={() => setModal("search")}>
          <MagnifyingGlass size={22} />
          검색
        </button>
        <a href="#/following">
          <BookmarkSimple size={22} />내 추적
        </a>
      </nav>
      {modal === "search" ? (
        <Search data={data} close={() => setModal(null)} />
      ) : (
        modal && (
          <EvidenceDetail
            record={modal}
            data={data}
            close={() => setModal(null)}
          />
        )
      )}
      <div className={`toast ${toast ? "visible" : ""}`} role="status">
        {toast}
      </div>
    </>
  );
}
