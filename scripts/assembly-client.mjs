const BASE = "https://open.assembly.go.kr/portal/openapi/";

// Keys are sent only to the official origin. Errors and provenance never contain them.
export function createAssemblyClient({
  key,
  full = false,
  fetchImpl = fetch,
  now = Date.now,
  maxRequests = 64,
  maxMs = 180000,
  pageSize = 1000,
} = {}) {
  if (full && !key)
    throw new Error(
      "AUTH_REQUIRED: Set ASSEMBLY_API_KEY outside source control.",
    );
  if (key && !/^[a-zA-Z0-9]{16,128}$/.test(key))
    throw new Error("AUTH_FORMAT: Invalid credential format.");
  const sources = [];
  let requests = 0;
  const started = now();
  async function readPage(service, params, page) {
    if (!/^[A-Za-z0-9]+$/.test(service)) throw new Error("INVALID_SERVICE");
    if (
      Object.keys(params).some((k) =>
        ["key", "type", "pindex", "psize"].includes(k.toLowerCase()),
      )
    )
      throw new Error("RESERVED_PARAMETER");
    if (++requests > maxRequests || now() - started >= maxMs)
      throw new Error("BUDGET_EXCEEDED: Existing snapshot preserved.");
    const clean = new URL(service, BASE);
    Object.entries({
      Type: "json",
      pSize: full ? String(pageSize) : "5",
      pIndex: String(page),
      ...params,
    }).forEach(([k, v]) => clean.searchParams.set(k, v));
    const target = new URL(clean);
    if (key) target.searchParams.set("KEY", key);
    let json;
    try {
      const response = await fetchImpl(target, {
        redirect: "error",
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(15000, maxMs - (now() - started))),
        ),
      });
      if (!response.ok) throw new Error();
      json = await response.json();
    } catch {
      throw new Error(`${service}: REQUEST_FAILED (request details omitted).`);
    }
    const blocks = json?.[service];
    const head = Array.isArray(blocks)
      ? blocks.find((b) => Array.isArray(b?.head))?.head
      : undefined;
    const result = head?.find((h) => h?.RESULT)?.RESULT ?? json?.RESULT;
    if (result?.CODE !== "INFO-000") {
      const code =
        typeof result?.CODE === "string" &&
        /^(INFO|ERROR)-\d{3}$/.test(result.CODE)
          ? result.CODE
          : "INVALID_RESPONSE";
      throw new Error(`${service}: ${code}`);
    }
    if (!Array.isArray(blocks) || !Array.isArray(head))
      throw new Error(`${service}: INVALID_RESPONSE`);
    const rows = blocks.find((b) => Array.isArray(b?.row))?.row;
    const total = head.find(
      (h) => h?.list_total_count !== undefined,
    )?.list_total_count;
    if (
      !Array.isArray(rows) ||
      !Number.isSafeInteger(total) ||
      total < rows.length ||
      rows.some((r) => !r || typeof r !== "object" || Array.isArray(r))
    )
      throw new Error(`${service}: INVALID_ROWS`);
    const id = `assembly-${sources.length + 1}`;
    sources.push({
      id,
      service,
      url: clean.href,
      recordedAt: new Date(now()).toISOString(),
      returned: rows.length,
      total,
      complete: rows.length === total,
    });
    return {
      rows: rows.map((r) => ({ ...r, __sourceId: id })),
      total,
      sourceId: id,
    };
  }
  async function read(service, params = {}) {
    const first = await readPage(service, params, 1);
    if (!full) return first;
    const pages = new Set([
      JSON.stringify(first.rows.map(({ __sourceId, ...r }) => r)),
    ]);
    for (let page = 2; first.rows.length < first.total; page++) {
      if (page > 50) throw new Error("PAGE_BUDGET_EXCEEDED");
      const next = await readPage(service, params, page);
      const fingerprint = JSON.stringify(
        next.rows.map(({ __sourceId, ...r }) => r),
      );
      if (
        !next.rows.length ||
        next.total !== first.total ||
        pages.has(fingerprint)
      )
        throw new Error(`${service}: PAGINATION_INCONSISTENT`);
      pages.add(fingerprint);
      first.rows.push(...next.rows);
    }
    if (first.rows.length !== first.total)
      throw new Error(`${service}: ROW_COUNT_MISMATCH`);
    return first;
  }
  return {
    read,
    sources,
    get requests() {
      return requests;
    },
  };
}
