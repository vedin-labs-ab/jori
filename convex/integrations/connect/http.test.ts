import { describe, expect, test } from "vitest"
import { readCallbackState } from "./http"

describe("readCallbackState", () => {
  test("returns the parsed state while it is fresh", async () => {
    const state = { createdAt: Date.now(), organizationId: "organization_1" }
    const result = await readCallbackState({
      value: JSON.stringify(state),
      parse: parseJsonState,
      label: "Test OAuth",
    })

    expect(result).toEqual({ ok: true, state })
  })

  test("rejects a state that fails to parse", async () => {
    const result = await readCallbackState({
      value: "not-a-state",
      parse: parseJsonState,
      label: "Test OAuth",
    })

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error("Expected a rejected state")
    }

    expect(result.response.status).toBe(400)
    expect(await result.response.text()).toBe("Invalid Test OAuth state")
  })

  test("rejects a state older than ten minutes", async () => {
    const state = { createdAt: Date.now() - 11 * 60 * 1000 }
    const result = await readCallbackState({
      value: JSON.stringify(state),
      parse: parseJsonState,
      label: "Test OAuth",
    })

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error("Expected a rejected state")
    }

    expect(result.response.status).toBe(400)
    expect(await result.response.text()).toBe("Expired Test OAuth state")
  })
})

async function parseJsonState(value: string) {
  return JSON.parse(value) as { createdAt: number }
}
