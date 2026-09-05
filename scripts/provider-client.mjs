export class ProviderError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
export const secretNames = [
  "ASSEMBLY_API_KEY",
  "YOUTUBE_API_KEY",
  "NAVER_CLIENT_ID",
  "NAVER_CLIENT_SECRET",
];
export function validateQuery(value) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > 80 ||
    /[\x00-\x1f]/.test(value)
  )
    throw new ProviderError("INVALID_INPUT");
  return value.trim();
}
function key(value) {
  if (!value) throw new ProviderError("KEY_REQUIRED");
  if (typeof value !== "string" || !/^[A-Za-z0-9_\-+/=]{8,256}$/.test(value))
    throw new ProviderError("KEY_FORMAT");
  return value;
}
function external(value) {
  try {
    const u = new URL(value);
    if (
      !["https:", "http:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      /^(localhost$|\d+\.\d+\.\d+\.\d+$|\[)/.test(u.hostname) ||
      u.hostname.endsWith(".local")
    )
      throw Error();
    return value;
  } catch {
    throw new ProviderError("INVALID_RESPONSE");
  }
}
const string = (v, max = 6000) => {
  if (typeof v !== "string" || v.length > max)
    throw new ProviderError("INVALID_RESPONSE");
  return v;
};
const date = (v) => {
  string(v, 100);
  if (!Number.isFinite(Date.parse(v)))
    throw new ProviderError("INVALID_RESPONSE");
  return v;
};
async function jsonRequest(url, headers, fetchImpl) {
  try {
    const response = await fetchImpl(url, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) {
        await reader.cancel();
        throw new ProviderError("INVALID_RESPONSE");
      }
      chunks.push(value);
    }
    let payload;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {}
    if (!response.ok) {
      const quota = payload?.error?.errors?.some?.((e) =>
        ["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(
          e?.reason,
        ),
      );
      throw new ProviderError(
        response.status === 429 || quota
          ? "RATE_LIMIT"
          : [400, 401, 403].includes(response.status)
            ? "AUTH_FAILED"
            : "UPSTREAM_FAILED",
      );
    }
    if (!payload || typeof payload !== "object")
      throw new ProviderError("INVALID_RESPONSE");
    return payload;
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    throw new ProviderError("UPSTREAM_FAILED");
  }
}
export async function searchProvider(
  provider,
  input,
  secrets,
  { fetchImpl = fetch, now = () => new Date(), naverMode = "hub" } = {},
) {
  const query = validateQuery(input.query);
  const page = input.page ?? "";
  if (
    typeof page !== "string" ||
    page.length > 300 ||
    !/^[A-Za-z0-9_=-]*$/.test(page)
  )
    throw new ProviderError("INVALID_INPUT");
  if (provider === "youtube") {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    Object.entries({
      part: "snippet",
      type: "video",
      q: query,
      maxResults: "10",
      relevanceLanguage: "ko",
      safeSearch: "moderate",
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    if (page) url.searchParams.set("pageToken", page);
    // Query credentials are never included in provenance, logs or returned errors.
    url.searchParams.set("key", key(secrets.YOUTUBE_API_KEY));
    const payload = await jsonRequest(url, {}, fetchImpl);
    if (!Array.isArray(payload.items) || payload.items.length > 10)
      throw new ProviderError("INVALID_RESPONSE");
    const videos = payload.items.map((item) => {
      const id = string(item.id?.videoId, 11),
        s = item.snippet;
      if (
        !/^[A-Za-z0-9_-]{11}$/.test(id) ||
        !s ||
        !/^UC[A-Za-z0-9_-]{22}$/.test(s.channelId)
      )
        throw new ProviderError("INVALID_RESPONSE");
      const thumbnail = s.thumbnails?.medium?.url;
      if (
        thumbnail &&
        (!external(thumbnail) || new URL(thumbnail).hostname !== "i.ytimg.com")
      )
        throw new ProviderError("INVALID_RESPONSE");
      return {
        id,
        title: string(s.title),
        channel: string(s.channelTitle),
        channelId: s.channelId,
        publishedAt: date(s.publishedAt),
        url: "https://www.youtube.com/watch?v=" + id,
        ...(thumbnail ? { thumbnail } : {}),
      };
    });
    const nextPage = payload.nextPageToken;
    if (
      nextPage !== undefined &&
      (typeof nextPage !== "string" ||
        !/^[A-Za-z0-9_=-]{1,300}$/.test(nextPage))
    )
      throw new ProviderError("INVALID_RESPONSE");
    return {
      provider,
      query,
      fetchedAt: now().toISOString(),
      videos,
      ...(nextPage ? { nextPage } : {}),
    };
  }
  if (provider === "naver") {
    if (!["hub", "legacy"].includes(naverMode))
      throw new ProviderError("INVALID_INPUT");
    const start = page ? Number(page) : 1;
    if (!Number.isInteger(start) || start < 1 || start > 991)
      throw new ProviderError("INVALID_INPUT");
    const url = new URL(
      naverMode === "hub"
        ? "https://naverapihub.apigw.ntruss.com/search/v1/news"
        : "https://openapi.naver.com/v1/search/news.json",
    );
    Object.entries({
      query,
      display: "10",
      start: String(start),
      sort: "sim",
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    if (naverMode === "hub") url.searchParams.set("format", "json");
    const headers =
      naverMode === "hub"
        ? {
            "X-NCP-APIGW-API-KEY-ID": key(secrets.NAVER_CLIENT_ID),
            "X-NCP-APIGW-API-KEY": key(secrets.NAVER_CLIENT_SECRET),
          }
        : {
            "X-Naver-Client-Id": key(secrets.NAVER_CLIENT_ID),
            "X-Naver-Client-Secret": key(secrets.NAVER_CLIENT_SECRET),
          };
    const payload = await jsonRequest(url, headers, fetchImpl);
    if (
      !Array.isArray(payload.items) ||
      payload.items.length > 10 ||
      !Number.isInteger(payload.total) ||
      payload.total < 0
    )
      throw new ProviderError("INVALID_RESPONSE");
    // Pass every displayed field unchanged and in the provider's original order.
    const news = payload.items.map((item) => ({
      title: string(item.title),
      description: string(item.description),
      link: external(item.link),
      originallink: item.originallink ? external(item.originallink) : "",
      pubDate: date(item.pubDate),
    }));
    const next = start + 10;
    return {
      provider,
      query,
      fetchedAt: now().toISOString(),
      total: payload.total,
      news,
      ...(next <= Math.min(payload.total, 991)
        ? { nextPage: String(next) }
        : {}),
    };
  }
  throw new ProviderError("INVALID_INPUT");
}
