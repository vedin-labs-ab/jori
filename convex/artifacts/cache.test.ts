import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import {
  canStoreArtifactToolCacheValue,
  createArtifactToolCacheKey,
  normalizeArtifactToolCacheOptions,
} from "./tools/cache"

describe("artifact tool cache", () => {
  test("clamps requested cache TTLs to the supported window", () => {
    expect(normalizeArtifactToolCacheOptions({}).ttlMs).toBe(15 * 60 * 1000)
    expect(normalizeArtifactToolCacheOptions({ ttlMs: 60 * 1000 }).ttlMs).toBe(
      15 * 60 * 1000
    )
    expect(
      normalizeArtifactToolCacheOptions({ ttlMs: 90 * 60 * 1000 }).ttlMs
    ).toBe(60 * 60 * 1000)
    expect(
      normalizeArtifactToolCacheOptions({
        forceRefresh: true,
        ttlMs: 30 * 60 * 1000,
      })
    ).toEqual({
      forceRefresh: true,
      ttlMs: 30 * 60 * 1000,
    })
  })

  test("uses canonical argument order for cache keys", async () => {
    const first = await createArtifactToolCacheKey({
      ...cacheKeyInput(),
      args: { a: 1, b: { c: true, d: ["x"] } },
    })
    const second = await createArtifactToolCacheKey({
      ...cacheKeyInput(),
      args: { b: { d: ["x"], c: true }, a: 1 },
    })

    expect(first).toBe(second)
  })

  test("separates keys by integration and version", async () => {
    const base = await createArtifactToolCacheKey(cacheKeyInput())
    const nextVersion = await createArtifactToolCacheKey({
      ...cacheKeyInput(),
      versionId: "next-version" as Id<"artifactVersions">,
    })
    const nextIntegration = await createArtifactToolCacheKey({
      ...cacheKeyInput(),
      integrationId: "next-integration" as Id<"integrations">,
    })

    expect(base).not.toBe(nextVersion)
    expect(base).not.toBe(nextIntegration)
  })

  test("rejects values that should not be persisted", () => {
    expect(canStoreArtifactToolCacheValue({ ok: true })).toBe(true)
    expect(canStoreArtifactToolCacheValue(undefined)).toBe(false)
    expect(canStoreArtifactToolCacheValue("x".repeat(600 * 1024))).toBe(false)
  })
})

function cacheKeyInput() {
  return {
    tenantId: "tenant",
    artifactId: "artifact" as Id<"artifacts">,
    versionId: "version" as Id<"artifactVersions">,
    personId: "person" as Id<"persons">,
    surface: "slack",
    tool: "conversations_replies",
    integrationId: "integration" as Id<"integrations">,
    args: { channel: "C123", ts: "123.456" },
  }
}
