import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import {
  canStoreAppToolCacheValue,
  createAppToolCacheKey,
  normalizeAppToolCacheOptions,
} from "./tools/cache"

describe("app tool cache", () => {
  test("clamps requested cache TTLs to the supported window", () => {
    expect(normalizeAppToolCacheOptions({}).ttlMs).toBe(15 * 60 * 1000)
    expect(normalizeAppToolCacheOptions({ ttlMs: 60 * 1000 }).ttlMs).toBe(
      15 * 60 * 1000
    )
    expect(normalizeAppToolCacheOptions({ ttlMs: 90 * 60 * 1000 }).ttlMs).toBe(
      60 * 60 * 1000
    )
    expect(
      normalizeAppToolCacheOptions({
        forceRefresh: true,
        ttlMs: 30 * 60 * 1000,
      })
    ).toEqual({
      forceRefresh: true,
      ttlMs: 30 * 60 * 1000,
    })
  })

  test("uses canonical argument order for cache keys", async () => {
    const first = await createAppToolCacheKey({
      ...cacheKeyInput(),
      args: { a: 1, b: { c: true, d: ["x"] } },
    })
    const second = await createAppToolCacheKey({
      ...cacheKeyInput(),
      args: { b: { d: ["x"], c: true }, a: 1 },
    })

    expect(first).toBe(second)
  })

  test("separates keys by integration and version", async () => {
    const base = await createAppToolCacheKey(cacheKeyInput())
    const nextVersion = await createAppToolCacheKey({
      ...cacheKeyInput(),
      versionId: "next-version" as Id<"appVersions">,
    })
    const nextIntegration = await createAppToolCacheKey({
      ...cacheKeyInput(),
      integrationId: "next-integration" as Id<"integrations">,
    })

    expect(base).not.toBe(nextVersion)
    expect(base).not.toBe(nextIntegration)
  })

  test("rejects values that should not be persisted", () => {
    expect(canStoreAppToolCacheValue({ ok: true })).toBe(true)
    expect(canStoreAppToolCacheValue(undefined)).toBe(false)
    expect(canStoreAppToolCacheValue("x".repeat(600 * 1024))).toBe(false)
  })
})

function cacheKeyInput() {
  return {
    organizationId: "organization",
    appId: "app" as Id<"apps">,
    versionId: "version" as Id<"appVersions">,
    personId: "person" as Id<"persons">,
    surface: "slack",
    tool: "conversations_replies",
    integrationId: "integration" as Id<"integrations">,
    args: { channel: "C123", ts: "123.456" },
  }
}
