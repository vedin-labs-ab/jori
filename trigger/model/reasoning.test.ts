import { describe, expect, test } from "vitest"
import { ingestReasoning, reasoningDisclosure } from "./reasoning"

describe("model reasoning ingestion", () => {
  test("keeps OpenAI summary reasoning", () => {
    // OpenAI hides raw CoT and exposes provider summaries only.
    expect(reasoningDisclosure("openai/gpt-5.5")).toBe("summary")
    expect(ingestReasoning("openai/gpt-5.5", "reviewed the plan")).toBe(
      "reviewed the plan"
    )
  })

  test("drops non-OpenAI raw reasoning", () => {
    expect(reasoningDisclosure("anthropic/claude-sonnet-4")).toBe("raw")
    expect(ingestReasoning("anthropic/claude-sonnet-4", "raw thought")).toBe(
      null
    )
  })

  test("drops unknown models and empty input", () => {
    expect(reasoningDisclosure("")).toBe("raw")
    expect(ingestReasoning("", "unclassified text")).toBe(null)
    expect(ingestReasoning("openai/gpt-5.5", "")).toBe(null)
  })
})
