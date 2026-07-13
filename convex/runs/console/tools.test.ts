import { expect, test } from "vitest"
import { getToolPermission } from "../../../contracts/permissions"
import { toolDetails } from "./tools"

test("omits empty access counts from tool labels", () => {
  const miloTool = catalogTool("add_automation", "write")
  const readTool = catalogTool("github_get_issue", "read")
  const writeTool = catalogTool("conversations_add_message", "write")

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
  const miloTool = catalogTool("search_runs", "read")
  const workspaceTool = catalogTool("read", "read")
  const slackTool = catalogTool("conversations_add_message", "write")

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
    label: "Milo · Read 2 · Slack · Write 1",
    groups: [
      {
        type: "milo",
        label: "Milo",
        tools: [miloTool, workspaceTool],
      },
      {
        type: "slack",
        label: "Slack",
        tools: [slackTool],
      },
    ],
  })
})

test("replaces persisted agent-facing tool descriptions", () => {
  const globTool = testTool(
    "glob",
    "Glob",
    "read",
    "Find files under /home/user/workspace by glob pattern with bounded results."
  )
  const gitTool = testTool(
    "git",
    "Git",
    "read",
    "Preferred tool for read-only Git inspection after a repository is cloned into /home/user/workspace/<repo>. Use cwd for the repo directory, and use args without the leading git executable."
  )

  expect(
    toolDetails({
      groups: [
        { surface: "milo", label: "Workspace", tools: [globTool, gitTool] },
      ],
      webSearch: true,
    })
  ).toContainEqual({
    type: "tools",
    label: "Milo · Read 2",
    groups: [
      {
        type: "milo",
        label: "Milo",
        tools: [catalogTool("glob", "read"), catalogTool("git", "read")],
      },
    ],
  })
})

function testTool(
  tool: string,
  label: string,
  access: "read" | "write",
  description = `${label} description.`
) {
  return {
    access,
    description,
    label,
    tool,
  }
}

function catalogTool(tool: string, access: "read" | "write") {
  const permission = getToolPermission(tool)

  if (permission === undefined) {
    throw new Error(`Missing permission: ${tool}`)
  }

  return {
    access,
    description: permission.description,
    label: permission.label,
    tool,
  }
}
