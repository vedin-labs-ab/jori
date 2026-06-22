import { describe, expect, test } from "vitest"
import { assemblePrompt } from "."
import {
  automationRuntimeInput,
  linearAutomationRuntimeInput,
  notionAutomationRuntimeInput,
} from "./fixtures"

describe("automation trigger prompts", () => {
  test("renders selected integration access", () => {
    const prompt = assemblePrompt(automationRuntimeInput())

    expect(prompt).toContain("An automation triggered this run.")
    expect(prompt).toContain("## Context\n\nCurrent UTC time:")
    expect(prompt.match(/Current UTC time:/g)).toHaveLength(1)
    expect(prompt).toContain("Integration access:")
    expect(prompt).toContain("- Web search: Allowed")
    expect(prompt).toContain("- GitHub: Read issue")
    expect(prompt).toContain("- Slack: Send message")
    expect(prompt).toContain("Use write actions only")
    expect(prompt).toContain("Run the automation")
  })

  test("renders disabled web search", () => {
    const prompt = assemblePrompt(automationRuntimeInput(false))

    expect(prompt).toContain("- Web search: Disabled")
  })

  test("renders integration target context for Linear events", () => {
    const prompt = assemblePrompt(linearAutomationRuntimeInput())

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
