import { expect, test } from "vitest"
import { createRunToolSnapshot } from "./snapshot"
import { type RuntimeToolCapabilityTool } from "./types"

test("stores all surface tool capabilities for run details", () => {
  const miloTools = [
    {
      access: "write" as const,
      description: "Persist a generated file.",
      label: "Save file",
      tool: "save_file",
    },
  ]

  expect(
    createRunToolSnapshot({
      webSearch: true,
      capabilities: [
        {
          surface: "milo",
          label: "Milo",
          tools: miloTools,
        },
        {
          surface: "slack",
          label: "Slack",
          tools: slackTools(),
        },
      ],
    })
  ).toEqual({
    groups: [
      {
        surface: "milo",
        label: "Milo",
        tools: miloTools,
      },
      {
        surface: "slack",
        label: "Slack",
        tools: slackTools(),
      },
    ],
    webSearch: true,
  })
})

function slackTools(): RuntimeToolCapabilityTool[] {
  return [
    {
      access: "write",
      description: "Post a Slack message.",
      label: "Send message",
      requiresApproval: true,
      tool: "conversations_add_message",
    },
    {
      access: "read",
      description: "Read Slack channel messages.",
      label: "Read channel history",
      tool: "conversations_history",
    },
  ]
}
