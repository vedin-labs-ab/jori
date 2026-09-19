import { afterEach, describe, expect, it, vi } from "vitest"
import { billingReturnUrl } from "./index"

describe("billingReturnUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns checkout flows to the console", () => {
    stubWindowOrigin()

    expect(billingReturnUrl()).toBe("https://jori.test/console")
  })

  it("marks portal returns so billing settings reopen", () => {
    stubWindowOrigin()

    expect(billingReturnUrl(true)).toBe(
      "https://jori.test/console?billing=portal"
    )
  })
})

function stubWindowOrigin() {
  vi.stubGlobal("window", { location: { origin: "https://jori.test" } })
}
