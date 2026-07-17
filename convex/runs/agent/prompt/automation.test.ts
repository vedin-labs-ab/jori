import { describe, expect, test } from "vitest"
import {
  automationRuntimeInput,
  linearAutomationRuntimeInput,
  notionAutomationRuntimeInput,
} from "../../../../test/convex/prompt"
import { assemblePrompt } from "."

describe("automation trigger prompts", () => {
  test("omits empty automation context", () => {
    const prompt = assemblePrompt(automationRuntimeInput())
    const context = prompt.context
    const instructions = prompt.instructions

    expect(context).toContain("An automation triggered this run.")
    expect(context).toContain("# Run\n\nRun ID: run\nRun started at:")
    expect(context.match(/Run ID:/g)).toHaveLength(1)
    expect(context).not.toContain("Active surface:")
    expect(context.match(/Run started at:/g)).toHaveLength(1)
    expect(context).not.toContain("Integration access:")
    expect(context).not.toContain("- Web search:")
    expect(context).not.toContain("\nEvent:\n")
    expect(context).not.toContain("- None")
    expect(context).toContain("## Instructions\n\nPost the daily digest.")
    expect(instructions).toContain(
      "no useful work remains by calling `finish_run`"
    )
    expect(instructions).not.toContain("final: true")
    expect(instructions).not.toContain("# Communication")
    expect(instructions).not.toContain("send_reply")
    expectNoSyntheticBlankLines(context)
    expectNoSyntheticBlankLines(instructions)
  })
})

describe("raw Markdown trigger instructions", () => {
  test("appends automation instructions as raw Markdown", () => {
    const input = automationRuntimeInput()
    const markdown = [
      "# Prepare the digest",
      "",
      "Keep this spacing.",
      "",
      "",
      "```json",
      '{ "channel": "#general" }',
      "```",
    ].join("\n")

    if (input.type !== "automation") {
      throw new Error("Expected automation input.")
    }

    input.instructions = markdown

    expect(
      assemblePrompt(input).context.endsWith(`## Instructions\n\n${markdown}`)
    ).toBe(true)
  })

  test("appends manual instructions as raw Markdown", () => {
    const base = automationRuntimeInput()
    const markdown = "## Delegate\n\n```txt\nUse #share_artifact.\n```"
    const input = {
      type: "instruction" as const,
      run: base.run,
      artifact: null,
      integrations: base.integrations,
      instructions: markdown,
      organization: null,
      requester: null,
      timezone: null,
      workstreams: null,
    }

    expect(
      assemblePrompt(input).context.endsWith(`## Instructions\n\n${markdown}`)
    ).toBe(true)
  })
})

describe("attached artifact context", () => {
  test("renders the state contract by entry name", () => {
    const input = automationRuntimeInput()

    if (input.type !== "automation") {
      throw new Error("Expected automation input.")
    }

    input.artifact = {
      artifactId: input.run.artifactId ?? ("artifact" as never),
      title: "Meeting Briefing",
      contract: [
        {
          name: "briefings",
          scope: "shared",
          schemaName: "MeetingBriefings",
          schemaVersion: 3,
          description: "Canonical Meeting Briefing state.",
        },
        {
          name: "research",
          scope: "personal",
          schemaName: "MeetingBriefingResearch",
          schemaVersion: 3,
          description: null,
        },
      ],
    }

    const context = assemblePrompt(input).context

    expect(context).toContain("## Attached artifact")
    expect(context).toContain(
      "`Meeting Briefing` is this run's primary artifact"
    )
    expect(context).toContain("default to it when `artifactId` is omitted")
    expect(context).toContain(
      "- `briefings` (shared, MeetingBriefings v3): Canonical Meeting Briefing state."
    )
    expect(context).toContain(
      "- `research` (personal, MeetingBriefingResearch v3)"
    )
    expect(context).not.toContain(
      "- `research` (personal, MeetingBriefingResearch v3):"
    )
    expectNoSyntheticBlankLines(context)
  })

  test("stays out without an attached artifact", () => {
    expect(assemblePrompt(automationRuntimeInput()).context).not.toContain(
      "## Attached artifact"
    )
  })
})

describe("requester local time", () => {
  test("renders when the requester's timezone is known, else stays out", () => {
    const withZone = assemblePrompt({
      ...automationRuntimeInput(),
      timezone: "Europe/Stockholm",
    })

    expect(withZone.context).toMatch(
      /Requester local time: \w+, \d{4}-\d{2}-\d{2} \d{2}:\d{2} Europe\/Stockholm \(GMT\+\d\)\./
    )
    expect(assemblePrompt(automationRuntimeInput()).context).not.toContain(
      "Requester local time:"
    )
  })
})

describe("automation event prompts", () => {
  test("renders integration target context for Linear events", () => {
    const prompt = assemblePrompt(linearAutomationRuntimeInput()).context

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
      "Text:\n```text\ni wonder if this is worth spending time on\n```"
    )
  })

  test("renders integration target context for Notion events", () => {
    const prompt = assemblePrompt(notionAutomationRuntimeInput()).context

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
