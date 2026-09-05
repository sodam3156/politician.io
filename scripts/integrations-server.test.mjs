import { afterEach, describe, it, expect, vi } from "vitest";
import { mkdtemp, readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIntegrationServer } from "./integrations-server.mjs";
import { loadSecrets } from "./vault.mjs";
const servers = [],
  directories = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (s) =>
        new Promise((resolve) => {
          s.close(resolve);
          s.closeAllConnections();
        }),
    ),
  );
  await Promise.all(
    directories.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
async function setup(options = {}) {
  const root = await mkdtemp(join(tmpdir(), "politician-api-test-"));
  directories.push(root);
  const server = createIntegrationServer({
    root,
    getSecrets: async () => ({}),
    ...options,
  });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  const post = (path, data = { query: "국회" }, headers = {}) =>
    fetch(origin + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Politician-Request": "1",
        Origin: origin,
        ...headers,
      },
      body: JSON.stringify(data),
    });
  return { root, server, origin, post };
}
describe("local-only data connection server", () => {
  it.each([
    undefined,
    { powerShell: "C:\\untrusted.exe" },
    { powerShell: "pwsh.exe" },
    { powerShell: "\\\\remote.example\\share\\pwsh.exe" },
  ])("rejects missing or invalid vault runtime metadata without an environment fallback (%j)", async (runtime) => {
    const directory = await mkdtemp(join(tmpdir(), "politician-api-test-"));
    directories.push(directory);
    await writeFile(join(directory, "ASSEMBLY_API_KEY.dpapi"), "TEST_MARKER_NOT_A_SECRET");
    if (runtime) await writeFile(join(directory, "runtime.json"), JSON.stringify(runtime));
    const spawnImpl = vi.fn();
    await expect(loadSecrets({
      platform: "win32",
      env: { POLITICIAN_POWERSHELL: "C:\\untrusted.exe" },
      vaultDirectory: directory,
      spawnImpl,
    })).rejects.toMatchObject({ code: "VAULT_FAILED" });
    expect(spawnImpl).not.toHaveBeenCalled();
  });
  it("does not invoke a shell when a Windows user has not registered a vault", async () => {
    const directory = await mkdtemp(join(tmpdir(), "politician-api-test-"));
    directories.push(directory);
    const spawnImpl = vi.fn();
    expect(
      await loadSecrets({
        platform: "win32",
        env: {},
        vaultDirectory: directory,
        spawnImpl,
      }),
    ).toEqual({});
    expect(spawnImpl).not.toHaveBeenCalled();
  });
  it("invalidates a previous authentication result after a key is replaced", async () => {
    let current = "FIRST_TEST_KEY";
    const { post, origin } = await setup({
      getSecrets: async () => ({ YOUTUBE_API_KEY: current }),
      search: async () => ({ provider: "youtube", videos: [] }),
    });
    expect((await post("/api/search/youtube")).status).toBe(200);
    let status = await (
      await fetch(origin + "/api/integrations/status")
    ).json();
    expect(status.providers.find((p) => p.id === "youtube").state).toBe(
      "verified",
    );
    expect(JSON.stringify(status)).not.toContain("keyIdentity");
    current = "REPLACED_TEST_KEY";
    status = await (await fetch(origin + "/api/integrations/status")).json();
    expect(status.providers.find((p) => p.id === "youtube").state).toBe(
      "configured",
    );
  });
  it("does not report unconfigured providers as connected or expose secret values", async () => {
    const { origin } = await setup({
      getSecrets: async () => ({ YOUTUBE_API_KEY: "DO_NOT_EXPOSE_ME" }),
    });
    const response = await fetch(origin + "/api/integrations/status");
    const text = await response.text();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(text).not.toContain("DO_NOT_EXPOSE_ME");
    const data = JSON.parse(text);
    expect(data.providers.find((p) => p.id === "youtube").state).toBe(
      "configured",
    );
    expect(data.providers.find((p) => p.id === "naver").state).toBe("missing");
  });
  it("rejects foreign origins and missing anti-CSRF headers before any upstream request", async () => {
    const search = vi.fn(),
      { post, origin } = await setup({ search });
    expect(
      (
        await post(
          "/api/search/youtube",
          {},
          { Origin: "https://attacker.example" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(origin + "/api/search/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(origin + "/api/integrations/status", {
          headers: { "Sec-Fetch-Site": "cross-site" },
        })
      ).status,
    ).toBe(403);
    expect(search).not.toHaveBeenCalled();
  });
  it("does not consume a call when keys are missing", async () => {
    const { post, origin } = await setup();
    const response = await post("/api/search/youtube");
    expect((await response.json()).error.code).toBe("KEY_REQUIRED");
    const status = await (
      await fetch(origin + "/api/integrations/status")
    ).json();
    expect(status.providers.find((p) => p.id === "youtube").used).toBe(0);
  });
  it("enforces a persistent daily limit and stores no query or results", async () => {
    const search = vi.fn().mockResolvedValue({
      provider: "youtube",
      query: "PRIVATE_QUERY",
      videos: [{ title: "PRIVATE_CONTENT" }],
    });
    const { post, root, origin } = await setup({
      getSecrets: async () => ({ YOUTUBE_API_KEY: "PRIVATE_KEY" }),
      search,
    });
    await mkdir(join(root, ".local"), { recursive: true });
    await writeFile(
      join(root, ".local/api-usage.json"),
      JSON.stringify({
        day: new Date().toISOString().slice(0, 10),
        counts: { assembly: 0, youtube: 19, naver: 0 },
      }),
    );
    expect(
      (await post("/api/search/youtube", { query: "PRIVATE_QUERY" })).status,
    ).toBe(200);
    const second = await post("/api/search/youtube", {
      query: "PRIVATE_QUERY",
    });
    expect((await second.json()).error.code).toBe("DAILY_LIMIT");
    expect(search).toHaveBeenCalledTimes(1);
    const audit = await readFile(join(root, ".local/api-audit.json"), "utf8");
    expect(audit).not.toMatch(/PRIVATE_QUERY|PRIVATE_CONTENT|PRIVATE_KEY/);
    const status = await (
      await fetch(origin + "/api/integrations/status")
    ).json();
    expect(status.providers.find((p) => p.id === "youtube").used).toBe(20);
  });
  it("fails closed on a corrupted budget ledger", async () => {
    const { post, root } = await setup({
      getSecrets: async () => ({ YOUTUBE_API_KEY: "TEST_VALUE" }),
    });
    await mkdir(join(root, ".local"), { recursive: true });
    await writeFile(join(root, ".local/api-usage.json"), "{bad");
    expect((await post("/api/search/youtube")).status).toBe(502);
  });
  it("does not serve source, vault or path traversal requests", async () => {
    const { root, origin } = await setup();
    await mkdir(join(root, "dist"), { recursive: true });
    await writeFile(join(root, "dist/index.html"), "<h1>app</h1>");
    await writeFile(join(root, "private.txt"), "PRIVATE");
    expect((await fetch(origin + "/")).status).toBe(200);
    expect((await fetch(origin + "/%2e%2e%2fprivate.txt")).status).toBe(404);
    expect((await fetch(origin + "/.local/api-vault/value.dpapi")).status).toBe(
      404,
    );
  });
  it("uses only the four named environment values on non-Windows hosts", async () => {
    expect(
      await loadSecrets({
        platform: "linux",
        env: { YOUTUBE_API_KEY: "TEST_VALUE", UNRELATED_SECRET: "DO_NOT_LOAD" },
      }),
    ).toEqual({ YOUTUBE_API_KEY: "TEST_VALUE" });
  });
});
