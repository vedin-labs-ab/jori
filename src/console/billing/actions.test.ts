import { afterEach, describe, expect, it, vi } from "vitest"
import { billingReturnUrl } from "./actions"

describe("billingReturnUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns checkout flows to the console", () => {
    stubWindowOrigin()

    expect(billingReturnUrl()).toBe("https://milo.test/console")
  })

  it("marks portal returns so billing settings reopen", () => {
    stubWindowOrigin()

    expect(billingReturnUrl(true)).toBe(
      "https://milo.test/console?billing=portal"
    )
  })
})

function stubWindowOrigin() {
  vi.stubGlobal("window", { location: { origin: "https://milo.test" } })
}
