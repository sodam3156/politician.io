import { describe, it, expect, vi } from "vitest";
import { searchProvider, ProviderError } from "./provider-client.mjs";
const secrets = {
  YOUTUBE_API_KEY: "TEST_YOUTUBE_KEY_ONLY",
  NAVER_CLIENT_ID: "TEST_CLIENT_ID",
  NAVER_CLIENT_SECRET: "TEST_CLIENT_SECRET",
};
const respond = (json, status = 200) =>
  new Response(JSON.stringify(json), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const video = {
  id: { kind: "youtube#video", videoId: "abcdefghijk" },
  snippet: {
    title: "Test video",
    channelTitle: "Test channel",
    channelId: "UCabcdefghijklmnopqrstuv",
    publishedAt: "2026-09-05T00:00:00Z",
    thumbnails: {
      medium: { url: "https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg" },
    },
  },
};
const item = {
  title: "<b>Test</b> original title",
  description: "Original description",
  link: "https://news.naver.com/example",
  originallink: "https://example.org/article",
  pubDate: "Sat, 05 Sep 2026 10:00:00 +0900",
};
describe("provider contracts: synthetic responses, no external keys", () => {
  it("ignores explicit channel and playlist resources without dropping valid videos", async () => {
    const result = await searchProvider("youtube", { query: "test" }, secrets, {
      fetchImpl: async () => respond({ items: [
        video,
        { id: { kind: "youtube#channel", channelId: video.snippet.channelId } },
        { id: { kind: "youtube#playlist", playlistId: "TEST_PLAYLIST" } },
      ], nextPageToken: "NEXT" }),
    });
    expect(result.videos).toHaveLength(1);
    expect(result.nextPage).toBe("NEXT");
    for (const id of [{ videoId: "abcdefghijk" }, { kind: "unknown", videoId: "abcdefghijk" }, { kind: "youtube#video", videoId: "bad" }]) {
      await expect(searchProvider("youtube", { query: "test" }, secrets, {
        fetchImpl: async () => respond({ items: [{ ...video, id }] }),
      })).rejects.toThrow("INVALID_RESPONSE");
    }
  });
  it("distinguishes YouTube quota failures from key failures even when HTTP status is 403", async () => {
    await expect(
      searchProvider("youtube", { query: "test" }, secrets, {
        fetchImpl: async () =>
          respond({ error: { errors: [{ reason: "quotaExceeded" }] } }, 403),
      }),
    ).rejects.toThrow("RATE_LIMIT");
  });
  it("queries public videos using the fixed YouTube origin and omits keys in the result", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(respond({ items: [video], nextPageToken: "NEXT" }));
    const result = await searchProvider("youtube", { query: "국회" }, secrets, {
      fetchImpl,
    });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url.origin).toBe("https://www.googleapis.com");
    expect(url.searchParams.get("type")).toBe("video");
    expect(url.searchParams.get("key")).toBe(secrets.YOUTUBE_API_KEY);
    expect(options.redirect).toBe("error");
    expect(result.videos[0].url).toBe(
      "https://www.youtube.com/watch?v=abcdefghijk",
    );
    expect(JSON.stringify(result)).not.toContain(secrets.YOUTUBE_API_KEY);
    expect(result.nextPage).toBe("NEXT");
  });
  it("uses NAVER API HUB headers and preserves result content/order without an analysis field", async () => {
    const items = [item, { ...item, title: "Second" }];
    const fetchImpl = vi.fn().mockResolvedValue(respond({ items, total: 30 }));
    const result = await searchProvider("naver", { query: "국회" }, secrets, {
      fetchImpl,
    });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url.origin).toBe("https://naverapihub.apigw.ntruss.com");
    expect(options.headers["X-NCP-APIGW-API-KEY"]).toBe(
      secrets.NAVER_CLIENT_SECRET,
    );
    expect(result.news).toEqual(items);
    expect(result.nextPage).toBe("11");
    expect(result.headlines).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain(secrets.NAVER_CLIENT_SECRET);
  });
  it("supports an explicitly selected legacy NAVER application", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(respond({ items: [], total: 0 }));
    await searchProvider("naver", { query: "국회", page: "11" }, secrets, {
      fetchImpl,
      naverMode: "legacy",
    });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url.origin).toBe("https://openapi.naver.com");
    expect(options.headers["X-Naver-Client-Secret"]).toBe(
      secrets.NAVER_CLIENT_SECRET,
    );
    expect(url.searchParams.get("start")).toBe("11");
  });
  it("returns clear empty results and bounded pagination", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(respond({ items: [], total: 2000 }));
    const result = await searchProvider(
      "naver",
      { query: "empty", page: "991" },
      secrets,
      { fetchImpl },
    );
    expect(result.news).toEqual([]);
    expect(result.nextPage).toBeUndefined();
  });
  it("rejects absent keys, malformed queries and arbitrary destination input before fetching", async () => {
    const fetchImpl = vi.fn();
    await expect(
      searchProvider("youtube", { query: "국회" }, {}, { fetchImpl }),
    ).rejects.toThrow("KEY_REQUIRED");
    await expect(
      searchProvider("youtube", { query: " " }, secrets, { fetchImpl }),
    ).rejects.toThrow("INVALID_INPUT");
    await expect(
      searchProvider(
        "naver",
        { query: "ok", page: "https://example.org" },
        secrets,
        { fetchImpl },
      ),
    ).rejects.toThrow("INVALID_INPUT");
    await expect(
      searchProvider("unknown", { query: "ok" }, secrets, { fetchImpl }),
    ).rejects.toThrow("INVALID_INPUT");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("sanitizes network and authorization errors without reflecting bodies or URLs", async () => {
    for (const status of [401, 403, 429, 500]) {
      const fetchImpl = vi
        .fn()
        .mockResolvedValue(
          respond({ secret: secrets.NAVER_CLIENT_SECRET }, status),
        );
      await expect(
        searchProvider("naver", { query: "국회" }, secrets, { fetchImpl }),
      ).rejects.toThrow(
        status === 429
          ? "RATE_LIMIT"
          : status === 500
            ? "UPSTREAM_FAILED"
            : "AUTH_FAILED",
      );
    }
    const fetchImpl = () => {
      throw Error(secrets.YOUTUBE_API_KEY);
    };
    await expect(
      searchProvider("youtube", { query: "국회" }, secrets, { fetchImpl }),
    ).rejects.toThrow("UPSTREAM_FAILED");
  });
  it("rejects unknown payloads, dangerous links, invalid identifiers and oversized responses", async () => {
    for (const json of [
      {},
      { items: [{ ...video, id: { videoId: "bad" } }] },
      {
        items: [
          { ...video, snippet: { ...video.snippet, publishedAt: "bad" } },
        ],
      },
    ]) {
      await expect(
        searchProvider("youtube", { query: "국회" }, secrets, {
          fetchImpl: async () => respond(json),
        }),
      ).rejects.toBeInstanceOf(ProviderError);
    }
    await expect(
      searchProvider("naver", { query: "국회" }, secrets, {
        fetchImpl: async () =>
          respond({
            total: 1,
            items: [{ ...item, link: "javascript:alert(1)" }],
          }),
      }),
    ).rejects.toThrow("INVALID_RESPONSE");
    await expect(
      searchProvider("youtube", { query: "국회" }, secrets, {
        fetchImpl: async () => new Response("a".repeat(1024 * 1024 + 1)),
      }),
    ).rejects.toThrow("INVALID_RESPONSE");
  });
});
