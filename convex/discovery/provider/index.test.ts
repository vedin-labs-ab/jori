import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { namespace, prune, upsert } from "./index"

const mocks = vi.hoisted(() => ({ options: vi.fn(), namespace: vi.fn() }))
vi.mock("@turbopuffer/turbopuffer", () => ({
  default: class {
    constructor(options: unknown) {
      mocks.options(options)
    }
    namespace = mocks.namespace
  },
  NotFoundError: class extends Error {},
}))
beforeEach(() => {
  vi.stubEnv("TURBOPUFFER_API_KEY", "test-only-key")
  vi.stubEnv("CONVEX_CLOUD_URL", "https://preview-one.eu-west-1.convex.cloud")
})
afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

test("EU and US use explicit regional endpoints and reject an unknown geography", async () => {
  vi.stubEnv("JORI_REGION", "eu")
  await namespace("org")
  expect(mocks.options).toHaveBeenLastCalledWith(
    expect.objectContaining({ region: "aws-eu-west-1" })
  )
  vi.stubEnv("JORI_REGION", "us")
  await expect(namespace("org")).rejects.toThrow("Search region does not match")
  vi.stubEnv("CONVEX_CLOUD_URL", "https://preview-us.convex.cloud")
  await namespace("org")
  expect(mocks.options).toHaveBeenLastCalledWith(
    expect.objectContaining({ region: "aws-us-east-1" })
  )
  vi.stubEnv("JORI_REGION", "global")
  await expect(namespace("org")).rejects.toThrow()
  expect(mocks.options).toHaveBeenCalledTimes(2)
})

test("workspace and deployment namespace identities are isolated and opaque", async () => {
  vi.stubEnv("JORI_REGION", "eu")
  await namespace("confidential-workspace")
  await namespace("other-workspace")
  vi.stubEnv("CONVEX_CLOUD_URL", "https://preview-two.eu-west-1.convex.cloud")
  await namespace("confidential-workspace")
  const names = mocks.namespace.mock.calls.map((call) => call[0])
  expect(new Set(names).size).toBe(3)
  expect(names.every((name) => /^discovery-v2-[a-f0-9]{64}$/.test(name))).toBe(
    true
  )
})

test("existing content-addressed chunks patch metadata without embedding and stale chunks prune only afterward", async () => {
  vi.stubEnv("JORI_REGION", "eu")
  const write = vi.fn().mockResolvedValue({})
  mocks.namespace.mockReturnValue({
    query: vi.fn().mockResolvedValue({ rows: [{ id: "retained" }] }),
    write,
  })
  const rows = [
    {
      id: "retained",
      key: "files:one",
      text: "Unchanged",
      part: 1,
      revision: "new",
    },
    { id: "new", key: "files:one", text: "Changed", part: 0, revision: "new" },
  ]
  await upsert("org", rows)
  expect(write).toHaveBeenCalledOnce()
  expect(write.mock.calls[0][0]).toMatchObject({
    upsert_rows: [rows[1]],
    patch_rows: [
      { id: "retained", key: "files:one", part: 1, revision: "new" },
    ],
  })
  expect(write.mock.calls[0][0].patch_rows[0]).not.toHaveProperty("text")
  expect(write.mock.calls[0][0]).not.toHaveProperty("delete_by_filter")
  await prune("org", "files:one", rows)
  expect(write.mock.calls[1][0].delete_by_filter).toEqual([
    "And",
    [
      ["key", "Eq", "files:one"],
      ["id", "NotIn", ["retained", "new"]],
    ],
  ])
})
