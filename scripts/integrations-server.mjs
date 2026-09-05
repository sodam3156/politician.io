import { createServer } from "node:http";
import {
  readFile,
  writeFile,
  mkdir,
  rename,
  realpath,
  stat,
} from "node:fs/promises";
import { resolve, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { loadSecrets } from "./vault.mjs";
import {
  ProviderError,
  searchProvider,
  secretNames,
} from "./provider-client.mjs";

const LIMITS = { assembly: 4, youtube: 20, naver: 50 }; // App ceilings per UTC day, not provider quotas.
const required = {
  assembly: ["ASSEMBLY_API_KEY"],
  youtube: ["YOUTUBE_API_KEY"],
  naver: ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"],
};
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export function createIntegrationServer({
  root = resolve("."),
  getSecrets = loadSecrets,
  search = searchProvider,
  now = () => new Date(),
  spawnImpl = spawn,
  naverMode = process.env.NAVER_API_MODE || "hub",
} = {}) {
  const local = resolve(root, ".local");
  const ledgerPath = resolve(local, "api-usage.json");
  const auditPath = resolve(local, "api-audit.json");
  let mutation = Promise.resolve(),
    auditQueue = Promise.resolve();
  const busy = new Set(),
    verified = new Map(),
    children = new Set();
  let assemblyJob;
  const keyIdentity = (id, secrets) =>
    createHash("sha256")
      .update(JSON.stringify(required[id].map((k) => secrets[k] ?? "")))
      .digest("hex");
  const publicState = (id, secrets) => {
    const saved = verified.get(id);
    if (!saved || saved.keyIdentity !== keyIdentity(id, secrets)) return {};
    const { keyIdentity: omitted, ...state } = saved;
    return state;
  };
  async function ledger() {
    let current;
    try {
      current = JSON.parse(await readFile(ledgerPath, "utf8"));
    } catch (e) {
      if (e.code !== "ENOENT") throw new ProviderError("SERVICE_UNAVAILABLE");
    }
    const day = now().toISOString().slice(0, 10);
    if (!current || current.day !== day)
      return { day, counts: { assembly: 0, youtube: 0, naver: 0 } };
    if (
      !current.counts ||
      Object.keys(LIMITS).some(
        (p) => !Number.isInteger(current.counts[p]) || current.counts[p] < 0,
      )
    )
      throw new ProviderError("SERVICE_UNAVAILABLE");
    return current;
  }
  async function reserve(provider) {
    const task = mutation.then(async () => {
      const current = await ledger();
      if (current.counts[provider] >= LIMITS[provider])
        throw new ProviderError("DAILY_LIMIT");
      current.counts[provider]++;
      await mkdir(local, { recursive: true });
      await writeFile(ledgerPath + ".next", JSON.stringify(current));
      await rename(ledgerPath + ".next", ledgerPath);
    });
    mutation = task.catch(() => {});
    return task;
  }
  function audit(provider, state, rows = 0) {
    const task = auditQueue.then(async () => {
      await mkdir(local, { recursive: true });
      let entries = [];
      try {
        entries = JSON.parse(await readFile(auditPath, "utf8"));
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
      if (!Array.isArray(entries)) throw Error();
      entries.push({ at: now().toISOString(), provider, state, rows });
      await writeFile(auditPath, JSON.stringify(entries.slice(-500)));
    });
    auditQueue = task.catch(() => {});
    return task;
  }
  function allowed(req) {
    const port = server.address()?.port;
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!hosts.includes(req.headers.host)) return false;
    if (req.headers["sec-fetch-site"] === "cross-site") return false;
    if (
      req.headers.origin &&
      !hosts.map((h) => "http://" + h).includes(req.headers.origin)
    )
      return false;
    return req.method === "GET" || req.headers["x-politician-request"] === "1";
  }
  function send(res, status, value) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    res.end(JSON.stringify(value));
  }
  async function body(req) {
    if (
      !String(req.headers["content-type"] || "").startsWith("application/json")
    )
      throw new ProviderError("INVALID_INPUT");
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 4096) throw new ProviderError("INVALID_INPUT");
      chunks.push(chunk);
    }
    try {
      const b = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!b || typeof b !== "object" || Array.isArray(b)) throw Error();
      return b;
    } catch {
      throw new ProviderError("INVALID_INPUT");
    }
  }
  async function configured(provider) {
    const secrets = await getSecrets();
    if (required[provider].some((name) => !secrets[name]))
      throw new ProviderError("KEY_REQUIRED");
    return secrets;
  }
  async function sync(secrets) {
    const startedAt = now().toISOString();
    assemblyJob = { state: "running", startedAt };
    const env = { ...process.env };
    secretNames.forEach((k) => delete env[k]);
    env.ASSEMBLY_API_KEY = secrets.ASSEMBLY_API_KEY;
    const child = spawnImpl(
      process.execPath,
      ["scripts/sync-assembly.mjs", "--full"],
      { cwd: root, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    children.add(child);
    let done = false,
      output = "";
    const timer = setTimeout(() => child.kill(), 195000);
    child.stdout.on("data", (chunk) => {
      if (output.length < 4096) output += chunk;
    });
    child.stderr.on("data", () => {});
    const finish = async (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      children.delete(child);
      busy.delete("assembly");
      assemblyJob = {
        state: code === 0 ? "success" : "error",
        startedAt,
        message:
          code === 0
            ? "실제 국회 자료를 갱신했습니다. 화면에서 자료를 다시 읽어주세요."
            : "수집에 실패했습니다. 기존 스냅샷은 보존했습니다.",
      };
      if (code === 0)
        verified.set("assembly", {
          keyIdentity: keyIdentity("assembly", secrets),
          state: "verified",
          checkedAt: now().toISOString(),
        });
      await audit("assembly", code === 0 ? "success" : "error").catch(() => {});
      output = "";
    };
    child.on("error", () => void finish(1));
    child.on("close", (code) => void finish(code));
  }
  const server = createServer(async (req, res) => {
    try {
      if (!allowed(req))
        return send(res, 403, { error: { code: "FORBIDDEN" } });
      const pathname = new URL(req.url, "http://127.0.0.1").pathname;
      if (pathname === "/api/integrations/status" && req.method === "GET") {
        const [secrets, current] = await Promise.all([getSecrets(), ledger()]);
        return send(res, 200, {
          providers: Object.keys(required).map((id) => ({
            id,
            state: required[id].every((k) => secrets[k])
              ? "configured"
              : "missing",
            ...(required[id].every((k) => secrets[k])
              ? publicState(id, secrets)
              : {}),
            used: current.counts[id],
            limit: LIMITS[id],
          })),
          vault:
            process.platform === "win32"
              ? "windows-encrypted"
              : "environment-only",
          assemblyJob,
        });
      }
      if (pathname === "/api/assembly/sync" && req.method === "POST") {
        await body(req);
        if (busy.has("assembly")) throw new ProviderError("BUSY");
        busy.add("assembly");
        try {
          const secrets = await configured("assembly");
          await reserve("assembly");
          await audit("assembly", "started");
          await sync(secrets);
        } catch (e) {
          busy.delete("assembly");
          throw e;
        }
        return send(res, 202, assemblyJob);
      }
      const match = pathname.match(/^\/api\/search\/(youtube|naver)$/);
      if (match && req.method === "POST") {
        const provider = match[1],
          input = await body(req);
        if (busy.has(provider)) throw new ProviderError("BUSY");
        busy.add(provider);
        let currentKeyIdentity;
        try {
          const secrets = await configured(provider);
          currentKeyIdentity = keyIdentity(provider, secrets);
          // Validate before spending; the provider client validates again at its edge.
          const { validateQuery } = await import("./provider-client.mjs");
          validateQuery(input.query);
          await reserve(provider);
          await audit(provider, "started");
          const result = await search(provider, input, secrets, {
            naverMode,
            now,
          });
          verified.set(provider, {
            keyIdentity: currentKeyIdentity,
            state: "verified",
            checkedAt: now().toISOString(),
          });
          await audit(
            provider,
            "success",
            result.videos?.length ?? result.news?.length ?? 0,
          );
          return send(res, 200, result);
        } catch (e) {
          const code = e instanceof ProviderError ? e.code : "UPSTREAM_FAILED";
          verified.set(provider, {
            keyIdentity: currentKeyIdentity,
            state: "error",
            checkedAt: now().toISOString(),
            message: code,
          });
          await audit(provider, "error").catch(() => {});
          throw e;
        } finally {
          busy.delete(provider);
        }
      }
      if (pathname.startsWith("/api/"))
        return send(res, 404, { error: { code: "NOT_FOUND" } });
      if (req.method !== "GET")
        return send(res, 405, { error: { code: "METHOD_NOT_ALLOWED" } });
      const base = resolve(
        root,
        pathname === "/data/assembly.json" ? "public" : "dist",
      );
      const decoded = decodeURIComponent(
        pathname === "/" ? "index.html" : pathname.slice(1),
      );
      const target = resolve(base, decoded);
      const relativePath = relative(base, target);
      if (
        relativePath.startsWith("..") ||
        relativePath.startsWith(sep) ||
        !types[extname(target)]
      )
        return send(res, 404, { error: { code: "NOT_FOUND" } });
      const actual = await realpath(target),
        actualBase = await realpath(base);
      if (!actual.startsWith(actualBase + sep))
        return send(res, 403, { error: { code: "FORBIDDEN" } });
      const info = await stat(actual);
      if (!info.isFile() || info.size > 10 * 1024 * 1024)
        return send(res, 404, { error: { code: "NOT_FOUND" } });
      res.writeHead(200, {
        "Content-Type": types[extname(target)],
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "X-Frame-Options": "DENY",
      });
      res.end(await readFile(actual));
    } catch (e) {
      const code =
        e instanceof ProviderError
          ? e.code
          : e.code === "ENOENT"
            ? "NOT_FOUND"
            : "SERVICE_UNAVAILABLE";
      const status =
        code === "NOT_FOUND"
          ? 404
          : code === "FORBIDDEN"
            ? 403
            : code === "KEY_REQUIRED"
              ? 409
              : code === "INVALID_INPUT"
                ? 400
                : code === "BUSY" || code === "DAILY_LIMIT"
                  ? 429
                  : 502;
      if (!res.headersSent) send(res, status, { error: { code } });
      else res.end();
    }
  });
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  server.on("close", () => children.forEach((child) => child.kill()));
  return server;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = createIntegrationServer();
  server.listen(8771, "127.0.0.1", () =>
    console.log("Local data connections: http://127.0.0.1:8771/#/data"),
  );
  server.on("error", () => {
    console.error(
      "Local data server could not start. Check whether port 8771 is already in use.",
    );
    process.exitCode = 1;
  });
  const stop = () => {
    server.close();
    server.closeAllConnections();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
