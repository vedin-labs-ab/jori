import { expect, test } from "vitest"
import { type ToolCapability } from "../../../../contracts/permissions"
import { createRunToolSnapshot } from "./snapshot"

test("stores all native Jori tools in one group", () => {
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
  const saveFileTool = {
    access: "write" as const,
    description: "Persist a generated file.",
    label: "Save file",
    tool: "save_file",
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
          surface: "jori",
          label: "Jori",
          tools: [saveFileTool],
        },
        {
          surface: "slack",
          label: "Slack",
          tools: slackTools(),
        },
      ],
      lifecycleTools: [finishRunTool],
      sandboxTools: [gitTool],
    })
  ).toEqual({
    groups: [
      {
        surface: "jori",
        label: "Jori",
        tools: [finishRunTool, sendReplyTool, saveFileTool, gitTool],
      },
      {
        surface: "slack",
        label: "Slack",
        tools: slackTools(),
      },
    ],
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
    })
  ).toEqual({
    groups: [
      {
        surface: "github",
        label: "GitHub",
        tools: [cloneTool],
      },
      {
        surface: "jori",
        label: "Jori",
        tools: [gitTool],
      },
    ],
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
