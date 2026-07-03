import { describe, expect, test } from "vitest"
import { readProviderDataString } from "./data"

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
})
