import { mkdir, writeFile } from "node:fs/promises";

// Source-only clones start honestly unconfigured. Never overwrite a collected snapshot.
await mkdir("public/data", { recursive: true });
try {
  await writeFile(
    "public/data/assembly.json",
    JSON.stringify(
      {
        version: 1,
        recordedAt: new Date().toISOString(),
        status: "unconfigured",
        collectionMode: "unconfigured",
        scope:
          "API 미수집 상태입니다. 별도 표시된 수동 원문 검토 사례만 제공합니다.",
        people: [],
        bills: [],
        records: [],
        sources: [],
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}
