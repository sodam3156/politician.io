import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

// Inspect the Git index, not ignored user material. Report filenames only, never matches.
const git = process.env.GIT_EXECUTABLE || "git";
const run = (args) =>
  execFileSync(git, args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
const names = run(["ls-files", "-z"]).split("\0").filter(Boolean);
if (!names.length) throw new Error("No tracked/staged source files to audit.");
const rules = [
  [
    "private path",
    /(?:^|\/)(?:\.env[^/]*|\.local|\.agents|analysis-work|node_modules|dist|docs|assets|public)(?:\/|$)/,
  ],
  ["credential file", /(?:credential|token|secret|\.pem|\.xlsx|\.pdf)/i],
];
const contentRules = [
  ["possible API credential", /\b[a-f0-9]{32}\b/i],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "GitHub credential",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/,
  ],
  ["credential in URL", /[?&](?:KEY|api_key|access_token)=[A-Za-z0-9]{16,}/i],
  [
    "private workspace reference",
    /[CG]:[\\/](?:Users|내 드라이브)[\\/]|manyfast\.io\/editor\//i,
  ],
];
const problems = [];
for (const name of names) {
  for (const [rule, pattern] of rules)
    if (pattern.test(name)) problems.push({ file: name, rule });
  const staged = run(["show", ":" + name]);
  const working = await readFile(name, "utf8");
  for (const [rule, pattern] of contentRules)
    if (pattern.test(staged) || pattern.test(working))
      problems.push({ file: name, rule });
}
if (problems.length) {
  console.error(JSON.stringify({ status: "blocked", problems }, null, 2));
  process.exitCode = 1;
} else
  console.log(
    JSON.stringify({
      status: "passed",
      files: names.length,
      scope: "tracked/index + working source; ignored files excluded",
    }),
  );
