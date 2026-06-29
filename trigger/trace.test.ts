import { expect, test } from "vitest"
import { toolInputMetadataTrace, toolResultMetadataTrace } from "./metadata"
import { toolInputTrace } from "./trace"

test("summarizes git tool inputs without command output", () => {
  expect(
    toolInputTrace(
      "git",
      {
        args: ["log", "--oneline", "-10"],
        cwd: "milo",
        timeoutMs: 1000,
      },
      "tool.started"
    )
  ).toEqual({
    input: {
      args: ["log", "--oneline", "-10"],
      cwd: "milo",
      timeoutMs: 1000,
    },
  })
})

test("summarizes bash input as a bounded command preview", () => {
  expect(
    toolInputTrace(
      "bash",
      {
        command: `printf ${"x".repeat(600)}`,
        cwd: "milo",
      },
      "tool.started"
    )
  ).toEqual({
    input: {
      command: `printf ${"x".repeat(493)}`,
      cwd: "milo",
    },
  })
})

test("does not summarize unknown or completed tool calls", () => {
  expect(
    toolInputTrace("notion_create_page", { title: "Secret" }, "tool.started")
  ).toEqual({})
  expect(toolInputTrace("git", { args: ["status"] }, "tool.completed")).toEqual(
    {}
  )
})

test("summarizes web search metadata without exposing result snippets", () => {
  const input = {
    query: "current example",
    includeDomains: ["example.com"],
  }

  expect(toolInputMetadataTrace("web_search", input)).toEqual({
    metadata: [
      { kind: "target", text: "current example" },
      { kind: "scope", text: "in example.com" },
    ],
  })
  expect(
    toolResultMetadataTrace("web_search", input, {
      provider: { name: "exa", requestId: "request-1" },
      results: [
        {
          title: "Private title",
          snippet: "Sensitive page excerpt",
          url: "https://example.com/a",
        },
      ],
      truncated: false,
    })
  ).toEqual({
    metadata: [
      { kind: "target", text: "current example" },
      { kind: "scope", text: "in example.com" },
      { kind: "outcome", text: "1 result" },
    ],
  })
})

test("summarizes email write metadata without body content", () => {
  expect(
    toolInputMetadataTrace("google_gmail_send_message", {
      body: "Do not show this body",
      subject: "Launch notes",
      to: ["ada@example.com", "grace@example.com"],
    })
  ).toEqual({
    metadata: [
      { kind: "target", text: "Launch notes" },
      { kind: "scope", text: "2 recipients" },
    ],
  })
})

test.each([
  ["add_reaction", { reaction: "thumbsup" }, "👍"],
  ["slack_add_reaction", { name: "white_check_mark" }, "✅"],
  ["github_add_comment_reaction", { content: "hooray" }, "🎉"],
  ["linear_add_reaction", { emoji: "👍" }, "👍"],
] as const)("formats %s reaction metadata as emoji", (tool, input, reaction) => {
  expect(toolInputMetadataTrace(tool, input)).toEqual({
    metadata: [{ kind: "target", text: reaction }],
  })
  expect(toolResultMetadataTrace(tool, input, { ok: true })).toEqual({
    metadata: [{ kind: "target", text: reaction }],
  })
})
