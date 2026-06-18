import { expect, test } from "vitest"
import { toolDetails } from "./tools"

test("omits empty access counts from tool labels", () => {
  const miloTool = {
    access: "write" as const,
    description:
      "Create a task that starts on a time or provider event trigger.",
    label: "Add automation",
    tool: "add_automation",
  }
  const readTool = {
    access: "read" as const,
    description: "Read GitHub issues.",
    label: "Read issue",
    tool: "github_get_issue",
  }
  const writeTool = {
    access: "write" as const,
    description: "Post a Slack message.",
    label: "Send message",
    tool: "conversations_add_message",
  }

  expect(
    toolDetails({
      groups: [
        {
          surface: "milo",
          label: "Milo",
          tools: [miloTool],
        },
        {
          surface: "github",
          label: "GitHub",
          tools: [readTool],
        },
        {
          surface: "slack",
          label: "Slack",
          tools: [writeTool],
        },
      ],
      webSearch: true,
    })
  ).toContainEqual({
    type: "tools",
    label: "Milo · Write 1 · GitHub · Read 1 · Slack · Write 1",
    groups: [
      {
        type: "milo",
        label: "Milo",
        tools: [miloTool],
      },
      {
        type: "github",
        label: "GitHub",
        tools: [readTool],
      },
      {
        type: "slack",
        label: "Slack",
        tools: [writeTool],
      },
    ],
  })
})
