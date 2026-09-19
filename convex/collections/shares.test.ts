import { describe, expect, test } from "vitest"
import { mintedShareLink, randomShareSecret, sharesToRetire } from "./shares"

describe("share pruning", () => {
  test("overlapping live shares are all kept", () => {
    const live = [
      { createdAt: 1, expiresAt: 5_000 },
      { createdAt: 2, expiresAt: 9_000 },
    ]

    expect(sharesToRetire(live, 1_000)).toEqual([])
  })

  test("retires the oldest active share at capacity and keeps expired history", () => {
    const shares = Array.from({ length: 20 }, (_, index) => ({
      createdAt: index,
      expiresAt: 9_000,
    }))
    const expired = { createdAt: -1, expiresAt: 500 }

    expect(sharesToRetire([expired, ...shares.reverse()], 1_000)).toEqual([
      { createdAt: 0, expiresAt: 9_000 },
    ])
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
