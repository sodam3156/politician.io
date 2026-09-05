import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFile, access } from "node:fs/promises";
import { win32, join } from "node:path";
import { ProviderError, secretNames } from "./provider-client.mjs";
export async function loadSecrets({
  env = process.env,
  platform = process.platform,
  spawnImpl = spawn,
  vaultDirectory = fileURLToPath(
    new URL("../.local/api-vault/", import.meta.url),
  ),
} = {}) {
  const values = Object.fromEntries(
    secretNames.filter((k) => env[k]).map((k) => [k, env[k]]),
  );
  if (platform !== "win32") return values;
  const registered = await Promise.all(
    secretNames.map(async (name) => {
      try {
        await access(join(vaultDirectory, name + ".dpapi"));
        return true;
      } catch (e) {
        if (e.code === "ENOENT") return false;
        throw new ProviderError("VAULT_FAILED");
      }
    }),
  );
  if (!registered.some(Boolean)) return values;
  const script = fileURLToPath(new URL("./read-vault.ps1", import.meta.url));
  let shell;
  try {
    const runtime = JSON.parse(
      await readFile(join(vaultDirectory, "runtime.json"), "utf8"),
    );
    if (
      typeof runtime.powerShell !== "string" ||
      !/^[a-z]:[\\/]/i.test(runtime.powerShell) ||
      !win32.isAbsolute(runtime.powerShell) ||
      !["pwsh.exe", "powershell.exe"].includes(
        win32.basename(runtime.powerShell).toLowerCase(),
      )
    )
      throw Error();
    shell = runtime.powerShell;
  } catch {
    // No PATH/environment fallback. Re-run registration to repair missing metadata.
    throw new ProviderError("VAULT_FAILED");
  }
  const saved = await new Promise((resolve, reject) => {
    const child = spawnImpl(
      shell,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-File",
        script,
        "-Directory",
        vaultDirectory,
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "",
      failed = false;
    const timer = setTimeout(() => {
      failed = true;
      child.kill();
      reject(new ProviderError("VAULT_FAILED"));
    }, 8000);
    child.stdout.on("data", (data) => {
      stdout += data;
      if (stdout.length > 8192) {
        failed = true;
        child.kill();
      }
    });
    child.stderr.on("data", () => {}); // Never reflect shell output or decrypted values.
    child.on("error", () => {
      clearTimeout(timer);
      reject(new ProviderError("VAULT_FAILED"));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || failed)
        return reject(new ProviderError("VAULT_FAILED"));
      try {
        resolve(JSON.parse(stdout || "{}"));
      } catch {
        reject(new ProviderError("VAULT_FAILED"));
      }
      stdout = "";
    });
  });
  for (const name of secretNames)
    if (typeof saved[name] === "string") values[name] = saved[name];
  return values;
}
