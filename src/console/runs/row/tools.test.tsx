// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { makeExecution } from "@/shared/console/runs/fixtures"
import { renderExecutionRow } from "../fixtures"

vi.mock("convex/react", () => ({
  useQuery: () => ({ items: [], status: "loaded" }),
}))

afterEach(() => {
  cleanup()
})

test("marks approval-required tools in message run details", async () => {
  renderExecutionRow(executionWithApprovalTool())

  fireEvent.click(screen.getByRole("button", { name: /create a notion page/i }))

  await screen.findByRole("button", { name: "Open Notion tools" })

  const count = screen.getByText("2")

  expect(screen.getByText("Tools")).toBeDefined()
  expect(count.className).toContain("font-normal")
  expect(count.className).toContain("text-[0.625rem]")
  expect(count.className).toContain("text-muted-foreground")
  expect(screen.getByText(hasTextContent("Write 1*"))).toBeDefined()
  expect(screen.getByText("*").className).toContain("text-warning")

  fireEvent.click(screen.getByRole("button", { name: "Open Notion tools" }))

  expect(screen.getByText("Requires approval").className).toContain(
    "text-warning"
  )
  expect(screen.getAllByText("*")).toHaveLength(1)
})

test("omits empty access counts in message run details", async () => {
  renderExecutionRow(executionWithSingleAccessToolGroups())

  fireEvent.click(screen.getByRole("button", { name: /review tool access/i }))

  await screen.findByRole("button", { name: "Open GitHub tools" })

  expect(
    screen.getByRole("button", { name: "Open GitHub tools" })
  ).toBeDefined()
  expect(screen.getByRole("button", { name: "Open Slack tools" })).toBeDefined()
  expect(screen.getByText("Read 1")).toBeDefined()
  expect(screen.getByText("Write 1")).toBeDefined()
  expect(screen.queryByText("Read 0")).toBeNull()
  expect(screen.queryByText("Write 0")).toBeNull()
})

test("renders singular label for one tool in message run details", async () => {
  renderExecutionRow(executionWithSingleTool())

  fireEvent.click(screen.getByRole("button", { name: /read a github issue/i }))

  await screen.findByRole("button", { name: "Open GitHub tools" })

  expect(screen.getByText("Tool")).toBeDefined()
  expect(screen.queryByText("Tools")).toBeNull()
  expect(screen.queryByText("1")).toBeNull()
})

function executionWithApprovalTool() {
  return makeExecution({
    details: [
      {
        type: "tools",
        label: "Notion · Read 1 · Write 1*",
        groups: [
          {
            type: "notion",
            label: "Notion",
            tools: notionTools(),
          },
        ],
      },
    ],
    source: { type: "message", surface: "slack" },
    task: "Create a Notion page.",
    title: "Create a Notion page.",
    trigger: "Slack message",
  })
}

function executionWithSingleTool() {
  return makeExecution({
    details: [
      {
        type: "tools",
        label: "GitHub · Read 1",
        groups: [
          {
            type: "github",
            label: "GitHub",
            tools: [readIssueTool()],
          },
        ],
      },
    ],
    source: { type: "message", surface: "github" },
    task: "Read a GitHub issue.",
    title: "Read a GitHub issue.",
    trigger: "GitHub issue",
  })
}

function executionWithSingleAccessToolGroups() {
  return makeExecution({
    details: [
      {
        type: "tools",
        label: "GitHub · Read 1 · Slack · Write 1",
        groups: [
          {
            type: "github",
            label: "GitHub",
            tools: [readIssueTool()],
          },
          {
            type: "slack",
            label: "Slack",
            tools: [
              {
                access: "write" as const,
                description: "Post a Slack message.",
                label: "Send message",
                tool: "conversations_add_message",
              },
            ],
          },
        ],
      },
    ],
    source: { type: "message", surface: "slack" },
    task: "Review tool access.",
    title: "Review tool access.",
    trigger: "Slack message",
  })
}

function readIssueTool() {
  return {
    access: "read" as const,
    description: "Read GitHub issues.",
    label: "Read issue",
    tool: "github_get_issue",
  }
}

function hasTextContent(text: string) {
  return (_content: string, element: Element | null) =>
    element?.textContent === text
}

function notionTools() {
  return [
    {
      access: "write" as const,
      description: "Create a Notion page or database record.",
      label: "Create page",
      requiresApproval: true,
      tool: "notion_create_page",
    },
    {
      access: "read" as const,
      description: "Search shared Notion pages and databases.",
      label: "Search Notion",
      tool: "notion_search",
    },
  ]
}
