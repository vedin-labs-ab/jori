import { describe, expect, test } from "vitest"
import { assemblePrompt } from "."
import { automationRuntimeInput, runtimeInput } from "./fixtures"

describe("finish guidance", () => {
  test("prefers final tool calls for message runs", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).toContain("prefer setting `final: true`")
    expect(prompt).not.toContain("offer_integration")
    expect(prompt).not.toContain(
      "The run waits while active approvals or integration offers remain."
    )
    expectNoSyntheticBlankLines(prompt)
  })

  test("uses plain finish_run guidance for automation runs", () => {
    const prompt = assemblePrompt(automationRuntimeInput())

    expect(prompt).toContain(
      "Finish the run when no useful work remains by calling `finish_run`."
    )
    expect(prompt).not.toContain("offer_integration")
  })
})

function expectNoSyntheticBlankLines(prompt: string) {
  expect(prompt).not.toMatch(/\n{3,}/)
}
