import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { eligibleModels, requireEligibleModels } from "./eligibility"

const sdk = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock("@openrouter/sdk/models/modelslistresponse", () => ({
  modelsListResponseFromJSON: (json: string) => ({
    ok: true,
    value: JSON.parse(json),
  }),
}))
let serial = 0
const sol = {
  id: "openai/gpt-5.6-sol",
  supportedParameters: ["max_completion_tokens"],
}
const astra = { ...sol, id: "openai/gpt-6-astra" }
function listed(data: unknown[]) {
  return Response.json({ data })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("OPENROUTER_API_KEY", `test-key-${serial++}`)
  vi.stubGlobal("fetch", sdk.list)
  sdk.list.mockReset().mockResolvedValue(listed([sol]))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test("a cold start reads the authenticated regional catalog and coalesces lookups", async () => {
  expect(await Promise.all([eligibleModels(), eligibleModels()])).toEqual([
    [sol],
    [sol],
  ])
  expect(sdk.list).toHaveBeenCalledTimes(1)
  expect(sdk.list).toHaveBeenCalledWith(
    "https://eu.openrouter.ai/api/v1/models/user?limit=1000&output_modalities=all",
    expect.objectContaining({
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      redirect: "error",
    })
  )
})

test("unavailable candidates are rejected and region changes cannot reuse eligibility", async () => {
  await expect(requireEligibleModels([sol.id, astra.id])).rejects.toThrow(
    "unavailable in this region"
  )
  await expect(requireEligibleModels([])).rejects.toThrow(
    "unavailable in this region"
  )
  vi.stubEnv("JORI_REGION", "us")
  sdk.list.mockResolvedValue(listed([sol, astra]))
  expect(await requireEligibleModels([astra.id])).toEqual([astra])
  expect(sdk.list).toHaveBeenCalledTimes(2)
})

test("expiration rechecks eligibility and failures never authorize stale models", async () => {
  await eligibleModels()
  vi.setSystemTime(Date.now() + 60_001)
  sdk.list.mockResolvedValueOnce(
    new Response("private provider details", { status: 503 })
  )
  await expect(requireEligibleModels([sol.id])).rejects.toThrow(
    "Cannot verify models"
  )
  sdk.list.mockResolvedValue(listed([]))
  await expect(requireEligibleModels([sol.id])).rejects.toThrow(
    "unavailable in this region"
  )
  expect(sdk.list).toHaveBeenCalledTimes(3)
})

test("an incomplete catalog is never treated as authoritative", async () => {
  sdk.list.mockResolvedValue(listed(Array.from({ length: 1000 }, () => sol)))
  await expect(eligibleModels()).rejects.toThrow("Cannot verify models")
})

test("credential rotation invalidates cached workspace permissions", async () => {
  await eligibleModels()
  vi.stubEnv("OPENROUTER_API_KEY", "new-workspace-key")
  sdk.list.mockResolvedValue(listed([]))
  await expect(requireEligibleModels([sol.id])).rejects.toThrow(
    "unavailable in this region"
  )
  expect(sdk.list).toHaveBeenCalledTimes(2)
})

test("runtime eligibility includes non-chat models without adding them to the picker catalog", async () => {
  const image = { ...sol, id: "google/gemini-3.1-flash-image" }
  sdk.list.mockResolvedValue(listed([image]))
  expect(await requireEligibleModels([image.id])).toEqual([image])
})
