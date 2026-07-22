import { expect, test } from "vitest"
import { type ToolCapability } from "../../../../contracts/permissions"
import { createRunToolSnapshot } from "./snapshot"

test("stores all surface tool capabilities for run details", () => {
  const miloTools = [
    {
      access: "write" as const,
      description: "Persist a generated asset.",
      label: "Save asset",
      tool: "save_asset",
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

test("stores all native Milo tools in one group", () => {
  const finishRunTool = {
    access: "write" as const,
    description: "Finish this run.",
    label: "Finish run",
    tool: "finish_run",
  }
  const sendReplyTool = {
    access: "write" as const,
    description: "Send a visible reply.",
    label: "Send reply",
    tool: "send_reply",
  }
  const saveAssetTool = {
    access: "write" as const,
    description: "Persist a generated asset.",
    label: "Save asset",
    tool: "save_asset",
  }
  const gitTool = {
    access: "read" as const,
    description: "Inspect Git history.",
    label: "Git",
    tool: "git",
  }

  expect(
    createRunToolSnapshot({
      activeSurfaceTools: [sendReplyTool],
      capabilities: [
        {
          surface: "milo",
          label: "Milo",
          tools: [saveAssetTool],
        },
        {
          surface: "slack",
          label: "Slack",
          tools: slackTools(),
        },
      ],
      lifecycleTools: [finishRunTool],
      sandboxTools: [gitTool],
      webSearch: true,
    })
  ).toEqual({
    groups: [
      {
        surface: "milo",
        label: "Milo",
        tools: [finishRunTool, sendReplyTool, saveAssetTool, gitTool],
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

test("stores workspace tools after provider capabilities", () => {
  const gitTool = {
    access: "read" as const,
    description: "Inspect Git history.",
    label: "Git",
    tool: "git",
  }
  const cloneTool = {
    access: "read" as const,
    description: "Clone a repository.",
    label: "Clone repository",
    tool: "github_clone_repository",
  }

  expect(
    createRunToolSnapshot({
      capabilities: [
        {
          surface: "github",
          label: "GitHub",
          tools: [cloneTool],
        },
      ],
      sandboxTools: [gitTool],
      webSearch: false,
    })
  ).toEqual({
    groups: [
      {
        surface: "github",
        label: "GitHub",
        tools: [cloneTool],
      },
      {
        surface: "milo",
        label: "Milo",
        tools: [gitTool],
      },
    ],
    webSearch: false,
  })
})

function slackTools(): ToolCapability[] {
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
