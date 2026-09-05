import { describe, it, expect, vi } from "vitest";
import { createAssemblyClient } from "./assembly-client.mjs";

// Deliberately non-secret test credential.
const key = "TEST_CREDENTIAL_ONLY".replaceAll("_", "");
const page = (rows, total = rows.length) => ({
  ok: true,
  json: async () => ({
    TEST: [
      { head: [{ list_total_count: total }, { RESULT: { CODE: "INFO-000" } }] },
      { row: rows },
    ],
  }),
});
describe("bounded Assembly API client", () => {
  it("requires credentials for authenticated collection", () => {
    expect(() => createAssemblyClient({ full: true })).toThrow("AUTH_REQUIRED");
    expect(() => createAssemblyClient({ key: "invalid" })).toThrow(
      "AUTH_FORMAT",
    );
  });
  it("paginates, keeps per-page provenance and redacts credentials", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(page([{ id: 1 }, { id: 2 }], 3))
      .mockResolvedValueOnce(page([{ id: 3 }], 3));
    const client = createAssemblyClient({
      key,
      full: true,
      pageSize: 2,
      fetchImpl,
    });
    const result = await client.read("TEST", { BILL_NO: "123" });
    expect(result.rows).toHaveLength(3);
    expect(result.rows[2].__sourceId).toBe("assembly-2");
    expect(fetchImpl.mock.calls[1][0].searchParams.get("pIndex")).toBe("2");
    expect(fetchImpl.mock.calls[0][0].origin).toBe(
      "https://open.assembly.go.kr",
    );
    expect(fetchImpl.mock.calls[0][0].searchParams.get("KEY")).toBe(key);
    expect(fetchImpl.mock.calls[0][1].redirect).toBe("error");
    expect(JSON.stringify(client.sources)).not.toContain(key);
    expect(
      client.sources.every((s) => !new URL(s.url).searchParams.has("KEY")),
    ).toBe(true);
  });
  it("limits unauthenticated mode to one sample page", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page([{ id: 1 }], 90));
    const client = createAssemblyClient({ fetchImpl });
    expect((await client.read("TEST")).rows).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0].searchParams.get("pSize")).toBe("5");
  });
  it("rejects repeated or changing pages", async () => {
    for (const next of [
      page([{ id: 1 }], 2),
      page([{ id: 2 }], 3),
      page([], 2),
    ]) {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(page([{ id: 1 }], 2))
        .mockResolvedValueOnce(next);
      await expect(
        createAssemblyClient({ key, full: true, fetchImpl }).read("TEST"),
      ).rejects.toThrow("PAGINATION_INCONSISTENT");
    }
  });
  it("enforces request and elapsed-time budgets", async () => {
    await expect(
      createAssemblyClient({ maxRequests: 0 }).read("TEST"),
    ).rejects.toThrow("BUDGET_EXCEEDED");
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValue(200);
    await expect(
      createAssemblyClient({ now, maxMs: 100 }).read("TEST"),
    ).rejects.toThrow("BUDGET_EXCEEDED");
  });
  it("never exposes transport errors or API messages", async () => {
    const fetchImpl = async () => {
      throw new Error("secret=" + key);
    };
    await expect(
      createAssemblyClient({ key, fetchImpl }).read("TEST"),
    ).rejects.toThrow(/^TEST: REQUEST_FAILED \(request details omitted\).$/);
    const broken = async () => ({
      ok: true,
      json: async () => ({ RESULT: { CODE: "ERROR-300", MESSAGE: key } }),
    });
    await expect(
      createAssemblyClient({ key, fetchImpl: broken }).read("TEST"),
    ).rejects.toThrow(/^TEST: ERROR-300$/);
  });
  it("rejects malformed payloads and invalid totals", async () => {
    for (const json of [
      {},
      { RESULT: { CODE: "INFO-000" } },
      {
        TEST: [
          {
            head: [{ RESULT: { CODE: "INFO-000" } }, { list_total_count: -1 }],
          },
          { row: [] },
        ],
      },
    ]) {
      await expect(
        createAssemblyClient({
          fetchImpl: async () => ({ ok: true, json: async () => json }),
        }).read("TEST"),
      ).rejects.toThrow(/INVALID_/);
    }
  });
  it("rejects caller-controlled destinations and reserved parameters before fetching", async () => {
    const fetchImpl = vi.fn();
    const client = createAssemblyClient({ fetchImpl });
    await expect(client.read("../other")).rejects.toThrow("INVALID_SERVICE");
    await expect(client.read("TEST", { key: "override" })).rejects.toThrow(
      "RESERVED_PARAMETER",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
