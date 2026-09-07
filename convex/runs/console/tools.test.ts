import { expect, test } from "vitest"
import { catalogTool } from "../../../test/convex/tools"
import { toolDetails } from "./tools"

test("omits empty access counts from tool labels", () => {
  const joriTool = catalogTool("add_job", "write")
  const readTool = catalogTool("github_get_issue", "read")
  const writeTool = catalogTool("conversations_add_message", "write")

  expect(
    toolDetails({
      groups: [
        {
          surface: "jori",
          label: "Jori",
          tools: [joriTool],
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
    label: "Jori · Write 1 · GitHub · Read 1 · Slack · Write 1",
    groups: [
      {
        type: "jori",
        label: "Jori",
        tools: [joriTool],
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

test("combines native Jori groups in tool labels", () => {
  const runTool = testTool("finish_run", "Finish run", "write")
  const activeSurfaceTool = testTool("send_reply", "Send reply", "write")
  const joriTool = catalogTool("search_runs", "read")
  const workspaceTool = catalogTool("read", "read")
  const slackTool = catalogTool("conversations_add_message", "write")

  expect(
    toolDetails({
      groups: [
        { surface: "jori", label: "Run", tools: [runTool] },
        {
          surface: "jori",
          label: "Active surface",
          tools: [activeSurfaceTool],
        },
        { surface: "jori", label: "Jori", tools: [joriTool] },
        { surface: "slack", label: "Slack", tools: [slackTool] },
        { surface: "jori", label: "Workspace", tools: [workspaceTool] },
      ],
      webSearch: true,
    })
  ).toContainEqual({
    type: "tools",
    label: "Jori · Read 2 · Slack · Write 1",
    groups: [
      {
        type: "jori",
        label: "Jori",
        tools: [joriTool, workspaceTool],
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
        { surface: "jori", label: "Workspace", tools: [globTool, gitTool] },
      ],
      webSearch: true,
    })
  ).toContainEqual({
    type: "tools",
    label: "Jori · Read 2",
    groups: [
      {
        type: "jori",
        label: "Jori",
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
