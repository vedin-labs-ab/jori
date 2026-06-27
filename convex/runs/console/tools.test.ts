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

test("combines native Milo groups in tool labels", () => {
  const runTool = testTool("finish_run", "Finish run", "write")
  const activeSurfaceTool = testTool("send_reply", "Send reply", "write")
  const miloTool = testTool("list_tools", "List tools", "read")
  const workspaceTool = testTool("read", "Read", "read")
  const slackTool = testTool(
    "conversations_add_message",
    "Send message",
    "write"
  )

  expect(
    toolDetails({
      groups: [
        { surface: "milo", label: "Run", tools: [runTool] },
        {
          surface: "milo",
          label: "Active surface",
          tools: [activeSurfaceTool],
        },
        { surface: "milo", label: "Milo", tools: [miloTool] },
        { surface: "slack", label: "Slack", tools: [slackTool] },
        { surface: "milo", label: "Workspace", tools: [workspaceTool] },
      ],
      webSearch: true,
    })
  ).toContainEqual({
    type: "tools",
    label: "Milo · Read 2 · Write 2 · Slack · Write 1",
    groups: [
      {
        type: "milo",
        label: "Milo",
        tools: [runTool, activeSurfaceTool, miloTool, workspaceTool],
      },
      {
        type: "slack",
        label: "Slack",
        tools: [slackTool],
      },
    ],
  })
})

function testTool(tool: string, label: string, access: "read" | "write") {
  return {
    access,
    description: `${label} description.`,
    label,
    tool,
  }
}
