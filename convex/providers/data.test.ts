import { describe, expect, test } from "vitest"
import { readProviderDataArray, readProviderDataString } from "./data"

describe("provider data readers", () => {
  test("reads nested strings", () => {
    const data = {
      owner: {
        user: {
          name: "Ada Lovelace",
        },
      },
    }

    expect(readProviderDataString(data, "owner", "user", "name")).toBe(
      "Ada Lovelace"
    )
    expect(readProviderDataString(data, "owner", "user", "email")).toBe(
      undefined
    )
    expect(readProviderDataString(data, "owner", "user")).toBe(undefined)
  })

  test("reads arrays", () => {
    const mentions = [{ mentionText: "@milo" }]

    expect(readProviderDataArray({ mentions }, "mentions")).toBe(mentions)
    expect(readProviderDataArray({ mentions: "none" }, "mentions")).toEqual([])
  })
})
