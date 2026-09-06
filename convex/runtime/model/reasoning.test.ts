import { describe, expect, test } from "vitest"
import { ingestReasoning, readsReasoning } from "./reasoning"

describe("model reasoning ingestion", () => {
  test("keeps OpenAI summary reasoning", () => {
    // OpenAI hides raw CoT and exposes provider summaries only.
    expect(ingestReasoning("openai/gpt-5.6-sol", "reviewed the plan")).toBe(
      "reviewed the plan"
    )
  })

  test("drops non-OpenAI raw reasoning", () => {
    expect(ingestReasoning("anthropic/claude-sonnet-4", "raw thought")).toBe(
      null
    )
  })

  test("the draft shows reasoning under the same rule", () => {
    expect(readsReasoning("openai/gpt-5.6-sol")).toBe(true)
    expect(readsReasoning("anthropic/claude-sonnet-4")).toBe(false)
  })

  test("drops unknown models and empty input", () => {
    expect(ingestReasoning("", "unclassified text")).toBe(null)
    expect(ingestReasoning("openai/gpt-5.6-sol", "")).toBe(null)
  })
})
