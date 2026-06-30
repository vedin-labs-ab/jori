import { describe, expect, test } from "vitest"
import { assemblePrompt } from "."
import { automationRuntimeInput, runtimeInput } from "./fixtures"

describe("integration offer prompts", () => {
  test("renders awaited integration offer pause guidance for message runs", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).toContain("set `wait: true` on `offer_integration`")
    expect(prompt).toContain("the run pauses after the tool succeeds")
    expectNoSyntheticBlankLines(prompt)
  })

  test("omits integration offer pause guidance for automation runs", () => {
    const prompt = assemblePrompt(automationRuntimeInput())

    expect(prompt).not.toContain("set `wait: true` on `offer_integration`")
  })
})

function expectNoSyntheticBlankLines(prompt: string) {
  expect(prompt).not.toMatch(/\n{3,}/)
}
