import { NotFoundError } from "@turbopuffer/turbopuffer"
import { afterEach, expect, test, vi } from "vitest"
import { retrieve } from "./query"

const mocks = vi.hoisted(() => ({
  namespace: vi.fn(),
  multi: vi.fn(),
  lexical: vi.fn(),
}))
vi.mock("./index", () => ({ namespace: mocks.namespace }))
afterEach(() => vi.resetAllMocks())
function client() {
  mocks.namespace.mockResolvedValue({
    multiQuery: mocks.multi,
    query: mocks.lexical,
  })
}
const row = { id: "test", key: "files:one", revision: "current", part: 0 }

test("a native embedding outage falls back to lexical on the same namespace", async () => {
  client()
  mocks.multi.mockRejectedValue(new Error("Embedding unavailable"))
  mocks.lexical.mockResolvedValue({ rows: [row] })
  const result = await retrieve("org", "invoice", undefined, [])
  expect(result).toMatchObject({
    partial: true,
    unavailable: false,
    candidates: [{ key: row.key }],
  })
  expect(mocks.namespace).toHaveBeenCalledOnce()
  expect(mocks.namespace).toHaveBeenCalledWith("org")
  expect(mocks.lexical.mock.calls[0][0].rank_by[0]).toBe("Sum")
})

test("missing regional configuration fails closed without exposing the error", async () => {
  mocks.namespace.mockRejectedValue(new Error("Private credential details"))
  const result = await retrieve("org", "invoice", undefined, [])
  expect(result).toMatchObject({
    candidates: [],
    partial: true,
    unavailable: true,
  })
  expect(JSON.stringify(result)).not.toContain("Private")
  expect(mocks.lexical).not.toHaveBeenCalled()
})

test("prefilters retain owner overrides while constraining other grants to visible folders", async () => {
  client()
  mocks.multi.mockResolvedValue({
    results: [{ rows: [] }, { rows: [] }, { rows: [] }],
  })
  await retrieve(
    "org",
    "invoice",
    {
      owner: "owner:me",
      tokens: ["org", "team:finance"],
      folders: ["root", "allowed"],
    },
    ["files:seen"]
  )
  const queries = mocks.multi.mock.calls[0][0].queries
  for (const query of queries) {
    // Turbopuffer rejects grouped limits unless the grouping field is returned.
    expect(query.include_attributes).toContain("resource")
    const serialized = JSON.stringify(query.filters)
    expect(serialized).toContain('"owner:me"')
    expect(serialized).toContain('"folder","In",["root","allowed"]')
    expect(serialized).toContain('"key","NotIn",["files:seen"]')
  }
})

test("fusion rejects unrelated semantic neighbors and does not mix source revisions", async () => {
  client()
  mocks.multi.mockResolvedValue({
    results: [
      { rows: [row] },
      {
        rows: [
          { ...row, revision: "new", $dist: 0.2 },
          { ...row, id: "unrelated", key: "files:other", $dist: 0.74 },
        ],
      },
    ],
  })
  const result = await retrieve(
    "org",
    "what happened to invoices",
    undefined,
    []
  )
  expect(result.candidates.map((c) => c.revision).sort()).toEqual([
    "current",
    "new",
  ])
  expect(result.candidates.every((c) => c.key === row.key)).toBe(true)
})

test("a workspace without an index yet has no matches rather than an outage", async () => {
  client()
  const missing = Object.create(NotFoundError.prototype)
  mocks.multi.mockRejectedValue(missing)
  mocks.lexical.mockRejectedValue(missing)
  expect(
    await retrieve("new-workspace", "invoice", undefined, [])
  ).toMatchObject({ candidates: [], partial: false, unavailable: false })
})
