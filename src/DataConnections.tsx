import { useEffect, useState, useRef } from "react";
import {
  integrationCatalog,
  integrationMessage,
  type IntegrationStatus,
  type MediaResult,
} from "./integrations";
import "./integrations.css";

const message = (code: string) =>
  integrationMessage[code] ??
  "요청을 완료하지 못했습니다. 연결 상태를 확인해주세요.";
async function api<T>(path: string, input?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: input === undefined ? "GET" : "POST",
      headers:
        input === undefined
          ? {}
          : { "Content-Type": "application/json", "X-Politician-Request": "1" },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(message(payload.error?.code));
    return payload;
  } catch (e) {
    if (
      e instanceof Error &&
      Object.values(integrationMessage).includes(e.message)
    )
      throw e;
    throw new Error(message("SERVICE_UNAVAILABLE"));
  }
}
const stateLabel = {
  missing: "등록 필요",
  configured: "등록됨 · 실제 요청 대기",
  verified: "실제 요청 성공",
  error: "연결 점검 필요",
};
export function IntegrationsPanel({
  onAssemblyRefresh,
}: {
  onAssemblyRefresh: () => void;
}) {
  const [status, setStatus] = useState<IntegrationStatus>();
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  async function refresh() {
    try {
      setStatus(await api<IntegrationStatus>("/api/integrations/status"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (!syncing) return;
    let active = true,
      attempts = 0,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await api<IntegrationStatus>("/api/integrations/status");
        if (!active) return;
        setStatus(next);
        if (next.assemblyJob?.state === "success") {
          setSyncing(false);
          setNotice(next.assemblyJob.message ?? "갱신 완료");
          onAssemblyRefresh();
          return;
        }
        if (next.assemblyJob?.state === "error") {
          setSyncing(false);
          setNotice(next.assemblyJob.message ?? "갱신 실패");
          return;
        }
      } catch (e) {
        if (active) setNotice((e as Error).message);
      }
      if (active && ++attempts < 70) timer = setTimeout(poll, 3000);
      else if (active) {
        setSyncing(false);
        setNotice(
          "상태 확인 시간이 끝났습니다. 연결 상태 새로고침으로 완료 여부를 확인해주세요. 새 수집을 자동으로 시작하지 않았습니다.",
        );
      }
    };
    timer = setTimeout(poll, 1500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [syncing]);
  return (
    <section
      className="integrations-panel"
      aria-labelledby="connections-heading"
    >
      <div className="panel-heading">
        <span className="eyebrow">데이터 연결 관리</span>
        <h2 id="connections-heading">발급은 직접, 연결은 이곳에서.</h2>
        <p>
          이미지의 네 출처와 YouTube·네이버 뉴스의 역할을 나눴습니다. 등록됐다는
          표시와 실제 인증 성공은 다릅니다.
        </p>
      </div>
      <div className="connection-instructions">
        <ol>
          <li>아래 공식 링크에서 필요한 키를 발급합니다.</li>
          <li>
            프로젝트의 <code>scripts/connect-data.ps1</code> 보안 도우미에
            입력합니다. 채팅·GitHub에 키를 붙이지 마세요.
          </li>
          <li>
            <code>npm start</code> 후{" "}
            <a href="http://127.0.0.1:8771/#/data">로컬 연결 화면</a>에서 상태를
            확인합니다. 키 등록 후 서버를 다시 시작할 필요는 없습니다.
          </li>
        </ol>
        <p>
          Windows 계정 전용으로 암호화하며, 브라우저에는 키를 반환하지 않습니다.
          국회 키가 이미 있다면 다시 발급할 필요 없이 등록만 하면 됩니다.
        </p>
        <button className="button secondary" onClick={() => void refresh()}>
          연결 상태 새로고침
        </button>
        <p role="status">
          {error ||
            "키 등록만으로 뉴스 AI 분석·재배포 권한이 생기지는 않습니다."}
        </p>
      </div>
      <div className="connection-grid">
        {integrationCatalog.map((entry) => {
          const connection = status?.providers.find(
            (p) => p.id === entry.provider,
          );
          return (
            <article className="connection-card" key={entry.id}>
              <span className="eyebrow">
                {entry.type} ·{" "}
                {entry.type === "API"
                  ? connection
                    ? stateLabel[connection.state]
                    : "서버 연결 대기"
                  : "별도 인증 없음"}
              </span>
              <h3>{entry.label}</h3>
              <p>{entry.role}</p>
              <strong>{entry.fields}</strong>
              <p className="small-note">{entry.note}</p>
              <div className="connection-links">
                <a
                  className="text-link"
                  href={entry.issueUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {entry.type === "API" ? "발급 화면 열기" : "공식 출처 열기"}{" "}
                  ↗
                </a>
                {entry.guideUrl !== entry.issueUrl && (
                  <a
                    className="text-link"
                    href={entry.guideUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    공식 안내 ↗
                  </a>
                )}
              </div>
              {entry.type === "API" && connection && (
                <p className="small-note">
                  앱의 오늘 사용 {connection.used}/{connection.limit}
                  {entry.id === "assembly" ? "회 수집" : "회 검색"} · UTC 기준
                  {connection.checkedAt &&
                    ` · 확인 ${new Date(connection.checkedAt).toLocaleString("ko-KR")}`}
                </p>
              )}
              {connection?.message && entry.type === "API" && (
                <p role="status">{message(connection.message)}</p>
              )}
            </article>
          );
        })}
      </div>
      <div className="connection-actions">
        <button
          className="button primary"
          disabled={
            syncing ||
            !status ||
            status.providers.find((p) => p.id === "assembly")?.state ===
              "missing"
          }
          onClick={async () => {
            try {
              await api("/api/assembly/sync", {});
              setNotice("선택한 여섯 의안의 실제 자료를 수집 중입니다.");
              setSyncing(true);
            } catch (e) {
              setNotice((e as Error).message);
            }
          }}
        >
          {syncing ? "국회 자료 수집 중…" : "국회 실제 자료 갱신"}
        </button>
        <p role="status">
          {notice ||
            "하루 최대 4회, 회당 64요청·180초 상한. 실패하면 기존 자료를 보존합니다."}
        </p>
      </div>
    </section>
  );
}

// Only <b> markers become markup; all other content is rendered as inert text.
function SearchText({ value }: { value: string }) {
  const decode = (text: string) =>
    text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'");
  return (
    <>
      {value
        .split(/(<b>[\s\S]*?<\/b>)/g)
        .map((part, i) =>
          part.startsWith("<b>") && part.endsWith("</b>") ? (
            <b key={i}>{decode(part.slice(3, -4))}</b>
          ) : (
            <span key={i}>{decode(part)}</span>
          ),
        )}
    </>
  );
}
export function RelatedMedia({ personName }: { personName: string }) {
  const [provider, setProvider] = useState<"youtube" | "naver">("youtube");
  const [query, setQuery] = useState(personName);
  const [result, setResult] = useState<MediaResult>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setQuery(personName);
    setResult(undefined);
    setError("");
    setLoading(false);
    return () => {
      generation.current++;
    };
  }, [personName]);
  // Memory-only results are cleared on a new query, provider change, route unmount,
  // or after 15 minutes. They never enter analysis, localStorage, exports or logs.
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(undefined), 15 * 60 * 1000);
    return () => clearTimeout(t);
  }, [result]);
  async function search(page?: string) {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    setResult(undefined);
    try {
      const next = await api<MediaResult>(`/api/search/${provider}`, {
        query,
        page,
      });
      if (current === generation.current) setResult(next);
    } catch (e) {
      if (current === generation.current) setError((e as Error).message);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  return (
    <section className="related-media" aria-labelledby="media-heading">
      <span className="eyebrow">
        원문을 찾는 입구 · 분석 근거 자동 확정 아님
      </span>
      <h2 id="media-heading">뉴스와 영상에서 직접 확인하세요.</h2>
      <p>
        이름이 같아도 같은 정치인이나 같은 사건이라는 뜻은 아닙니다. 검색 결과를
        발언 전문으로 대신하지 않습니다.
      </p>
      <div className="mode-switch" role="group" aria-label="원문 검색 제공처">
        <button
          disabled={loading}
          aria-pressed={provider === "youtube"}
          onClick={() => {
            setProvider("youtube");
            setResult(undefined);
            setError("");
          }}
        >
          YouTube 영상
        </button>
        <button
          disabled={loading}
          aria-pressed={provider === "naver"}
          onClick={() => {
            setProvider("naver");
            setResult(undefined);
            setError("");
          }}
        >
          NAVER 뉴스 검색
        </button>
      </div>
      <form
        className="media-search"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label htmlFor="media-query">검색어</label>
        <input
          id="media-query"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResult(undefined);
          }}
          maxLength={80}
          disabled={loading}
        />
        <button className="button primary" disabled={loading || !query.trim()}>
          {loading ? "검색 중…" : "원문 검색"}
        </button>
      </form>
      {provider === "naver" && (
        <p className="data-notice">
          NAVER 검색결과 전용 영역입니다. 제공 순서·제목·링크를 유지하며
          저장·요약·AI 입력·분석 근거 자동 연결을 하지 않습니다. 광고나 결제도
          없습니다.
        </p>
      )}
      <p role="status">
        {error || (loading ? "제공처에 한 번 요청하고 있습니다." : "")}
      </p>
      {error && (
        <a className="text-link" href="#/data">
          키 발급·연결 상태 확인 →
        </a>
      )}
      {result && (
        <div className="media-results">
          <h3>
            {result.provider === "youtube"
              ? "YouTube 검색결과"
              : "NAVER 뉴스 검색결과"}
          </h3>
          {result.provider === "naver" && (
            <a
              className="text-link naver-attribution"
              href="https://developers.naver.com"
              target="_blank"
              rel="noreferrer"
            >
              NAVER Open API ↗
            </a>
          )}
          <p className="small-note">
            조회 시각 {new Date(result.fetchedAt).toLocaleString("ko-KR")} ·{" "}
            {result.provider === "naver"
              ? "게시일은 API가 제공한 뉴스 제공 시각입니다."
              : "영상 게시일이며 정치인의 실제 발언일과 다를 수 있습니다."}
          </p>
          {result.videos?.map((video) => (
            <article key={video.id} className="video-result">
              <a href={video.url} target="_blank" rel="noreferrer">
                {video.thumbnail && (
                  <img
                    src={video.thumbnail}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}
                <h4>
                  <SearchText value={video.title} />
                </h4>
              </a>
              <a
                className="text-link"
                href={`https://www.youtube.com/channel/${video.channelId}`}
                target="_blank"
                rel="noreferrer"
              >
                {video.channel}
              </a>
              <p>
                {new Date(video.publishedAt).toLocaleDateString("ko-KR")} ·
                YouTube에서 원문 확인 ↗
              </p>
            </article>
          ))}
          {result.news && (
            <ol className="naver-results">
              {result.news.map((item, i) => (
                <li key={i}>
                  <h4>
                    <a href={item.link} target="_blank" rel="noreferrer">
                      <SearchText value={item.title} />
                    </a>
                  </h4>
                  <p>
                    <SearchText value={item.description} />
                  </p>
                  <p className="small-note">{item.pubDate}</p>
                  <a
                    className="text-link"
                    href={item.originallink || item.link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {new URL(item.originallink || item.link).hostname} · 기사
                    원문 ↗
                  </a>
                </li>
              ))}
            </ol>
          )}
          {!(result.videos?.length || result.news?.length) && (
            <p>이 검색어의 결과가 없습니다. 이름이나 법안명을 바꿔보세요.</p>
          )}
          {result.nextPage && (
            <button
              className="button secondary"
              disabled={loading}
              onClick={() => void search(result.nextPage)}
            >
              다음 검색결과 · 추가 1회 요청
            </button>
          )}
          <button className="text-link" onClick={() => setResult(undefined)}>
            검색결과 지우기
          </button>
        </div>
      )}
    </section>
  );
}
