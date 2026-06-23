import { expect, test } from "vitest"
import { createRunToolSnapshot } from "./snapshot"
import { type RuntimeToolCapabilityTool } from "./types"

test("stores all surface tool capabilities for run details", () => {
  const miloTools = [
    {
      access: "write" as const,
      description: "Persist a generated attachment.",
      label: "Save attachment",
      tool: "save_attachment",
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

test("stores active surface tools ahead of provider capabilities", () => {
  expect(
    createRunToolSnapshot({
      activeSurfaceTools: [
        {
          access: "write",
          description: "Send a visible reply.",
          label: "Send reply",
          tool: "send_reply",
        },
        {
          access: "write",
          description: "Finish this run.",
          label: "Finish run",
          tool: "finish_run",
        },
      ],
      webSearch: true,
      capabilities: [
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
        label: "Active surface",
        tools: [
          {
            access: "write",
            description: "Send a visible reply.",
            label: "Send reply",
            tool: "send_reply",
          },
          {
            access: "write",
            description: "Finish this run.",
            label: "Finish run",
            tool: "finish_run",
          },
        ],
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
