import { expect, test } from "vitest"
import { createExecutionToolSnapshot } from "./snapshot"
import { type RuntimeToolCapabilityTool } from "./types"

test("stores connected-provider tool capabilities for execution details", () => {
  expect(
    createExecutionToolSnapshot({
      webSearch: true,
      capabilities: [
        {
          provider: "milo",
          label: "Milo",
          tools: [
            {
              access: "write",
              description: "Persist a generated file.",
              label: "Save artifact",
              tool: "save_artifact",
            },
          ],
        },
        {
          provider: "slack",
          label: "Slack",
          tools: slackTools(),
        },
      ],
    })
  ).toEqual({
    groups: [
      {
        provider: "slack",
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
