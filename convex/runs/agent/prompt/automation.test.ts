import { describe, expect, test } from "vitest"
import { assemblePrompt } from "."
import {
  automationRuntimeInput,
  linearAutomationRuntimeInput,
  notionAutomationRuntimeInput,
} from "./fixtures"

describe("automation trigger prompts", () => {
  test("omits empty automation context", () => {
    const prompt = assemblePrompt(automationRuntimeInput())

    expect(prompt).toContain("An automation triggered this run.")
    expect(prompt).toContain("# Run\n\nRun ID: run\nRun started at:")
    expect(prompt.match(/Run ID:/g)).toHaveLength(1)
    expect(prompt).not.toContain("Active surface:")
    expect(prompt.match(/Run started at:/g)).toHaveLength(1)
    expect(prompt).not.toContain("Integration access:")
    expect(prompt).not.toContain("- Web search:")
    expect(prompt).not.toContain("\nEvent:\n")
    expect(prompt).not.toContain("- None")
    expect(prompt.indexOf("# Finish")).toBeLessThan(prompt.indexOf("# Trigger"))
    expect(prompt).toContain("Use `finish_run` to complete the run")
    expect(prompt).not.toContain("# Communication")
    expect(prompt).not.toContain("send_reply")
    expectNoSyntheticBlankLines(prompt)
  })

  test("renders integration target context for Linear events", () => {
    const prompt = assemblePrompt(linearAutomationRuntimeInput())

    expect(prompt).toContain("\nEvent:\n")
    expect(prompt).not.toContain("Integration access:")
    expect(prompt).toContain("- Type: issue.comment.edited")
    expect(prompt).toContain("- Integration: Linear")
    expect(prompt).toContain("- Issue ID: issue-id")
    expect(prompt).toContain("- Issue key: VED-1")
    expect(prompt).toContain("- Issue title: Get familiar with Linear")
    expect(prompt).toContain(
      "- Issue URL: https://linear.app/acme/issue/VED-1/get-familiar"
    )
    expect(prompt).toContain("- Comment ID: comment-id")
    expect(prompt).toContain(
      "- Comment URL: https://linear.app/acme/issue/VED-1/get-familiar#comment-id"
    )
    expect(prompt).toContain(
      "- Text: i wonder if this is worth spending time on"
    )
  })

  test("renders integration target context for Notion events", () => {
    const prompt = assemblePrompt(notionAutomationRuntimeInput())

    expect(prompt).toContain("\nEvent:\n")
    expect(prompt).toContain("- Type: comment.created")
    expect(prompt).toContain("- Integration: Notion")
    expect(prompt).toContain("- Page ID: page-id")
    expect(prompt).toContain("- Comment ID: comment-id")
    expect(prompt).toContain("- Entity ID: comment-id")
    expect(prompt).toContain("- Entity type: comment")
    expect(prompt).toContain("- Parent ID: block-id")
    expect(prompt).toContain("- Parent type: block")
    expect(prompt).toContain("- Notion event ID: notion-event-id")
    expect(prompt).toContain("- Notion event type: comment.created")
  })
})

function expectNoSyntheticBlankLines(prompt: string) {
  expect(prompt).not.toMatch(/\n{3,}/)
}
