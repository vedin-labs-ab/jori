import { describe, expect, test } from "vitest"
import { assemblePrompt } from "."
import { automationRuntimeInput, runtimeInput } from "./fixtures"

describe("integration offer prompts", () => {
  test("renders integration offer final guidance for message runs", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).toContain("call `offer_integration`")
    expect(prompt).toContain("set the root `final` field to `true`")
    expect(prompt).toContain(
      "The run waits while active approvals or integration offers remain."
    )
    expectNoSyntheticBlankLines(prompt)
  })

  test("omits integration offer final guidance for automation runs", () => {
    const prompt = assemblePrompt(automationRuntimeInput())

    expect(prompt).not.toContain("call `offer_integration`")
  })
})

function expectNoSyntheticBlankLines(prompt: string) {
  expect(prompt).not.toMatch(/\n{3,}/)
}
