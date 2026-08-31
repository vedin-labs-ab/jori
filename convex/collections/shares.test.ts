import { describe, expect, test } from "vitest"
import {
  canOpenShare,
  mintedShareLink,
  randomShareSecret,
  sharesToRetire,
} from "./shares"

const share = { secret: "s3cret", expiresAt: 10_000, organizationId: "org" }
const material = { organizationId: "org" }

function openArgs(overrides: Partial<Parameters<typeof canOpenShare>[0]> = {}) {
  return {
    share,
    material,
    creatorHasAccess: true,
    secret: "s3cret",
    now: 1_000,
    ...overrides,
  }
}

describe("share opening", () => {
  test("accepts a live share for an active material", () => {
    expect(canOpenShare(openArgs())).toBe(true)
  })

  test("rejects a wrong secret", () => {
    expect(canOpenShare(openArgs({ secret: "wrong" }))).toBe(false)
  })

  test("rejects an expired share", () => {
    expect(canOpenShare(openArgs({ now: 10_000 }))).toBe(false)
  })

  test("rejects a share from another organization", () => {
    expect(
      canOpenShare(openArgs({ material: { organizationId: "other" } }))
    ).toBe(false)
  })

  test("rejects archived materials", () => {
    expect(
      canOpenShare(
        openArgs({ material: { organizationId: "org", archivedAt: 5 } })
      )
    ).toBe(false)
  })

  test("rejects shares whose creator lost access to the material", () => {
    expect(canOpenShare(openArgs({ creatorHasAccess: false }))).toBe(false)
  })
})

describe("share pruning", () => {
  test("overlapping live shares are all kept", () => {
    const live = [
      { createdAt: 1, expiresAt: 5_000 },
      { createdAt: 2, expiresAt: 9_000 },
    ]

    expect(sharesToRetire(live, 1_000)).toEqual([])
  })

  test("expired shares remain in history", () => {
    const expired = { createdAt: 1, expiresAt: 500 }

    expect(
      sharesToRetire([expired, { createdAt: 2, expiresAt: 9_000 }], 1_000)
    ).toEqual([])
  })

  test("the oldest active shares make room at capacity", () => {
    const shares = Array.from({ length: 20 }, (_, index) => ({
      createdAt: index,
      expiresAt: 9_000,
    }))
    const pruned = sharesToRetire(shares, 1_000)

    expect(pruned).toHaveLength(1)
    expect(pruned[0]?.createdAt).toBe(0)
  })
})

describe("share secrets", () => {
  test("are 32 random bytes in hex", () => {
    const secret = randomShareSecret()

    expect(secret).toMatch(/^[0-9a-f]{64}$/)
    expect(randomShareSecret()).not.toBe(secret)
  })
})

describe("share links", () => {
  test("carry the secret in the fragment", () => {
    expect(
      mintedShareLink("/tables/table_1", "s3cret", 9, {
        JORI_APP_URL: "https://jori.example",
      })
    ).toEqual({
      url: "https://jori.example/tables/table_1#share=s3cret",
      urlPath: "/tables/table_1#share=s3cret",
      expiresAt: 9,
    })
  })

  test("fall back to the path without a configured origin", () => {
    expect(mintedShareLink("/tables/table_1", "s3cret", 9, {})).toEqual({
      url: "/tables/table_1#share=s3cret",
      urlPath: "/tables/table_1#share=s3cret",
      expiresAt: 9,
    })
  })
})
