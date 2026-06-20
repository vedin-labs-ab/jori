// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ExecutionItem } from "../types"
import { ExecutionRow } from "./index"

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
})

afterEach(() => {
  cleanup()
})

test("marks approval-required tools in message run details", () => {
  render(
    <TooltipProvider>
      <ExecutionRow
        execution={executionWithApprovalTool()}
        now={1700000001000}
        tenantId="tenant"
      />
    </TooltipProvider>
  )

  fireEvent.click(screen.getByRole("button", { name: /create a notion page/i }))

  expect(screen.getByText(hasTextContent("Write 1*"))).toBeDefined()
  expect(screen.getByText("*").className).toContain("text-warning")

  fireEvent.click(screen.getByRole("button", { name: "Open Notion tools" }))

  expect(screen.getByText("Requires approval").className).toContain(
    "text-warning"
  )
  expect(screen.getAllByText("*")).toHaveLength(1)
})

test("omits empty access counts in message run details", () => {
  render(
    <TooltipProvider>
      <ExecutionRow
        execution={executionWithSingleAccessToolGroups()}
        now={1700000001000}
        tenantId="tenant"
      />
    </TooltipProvider>
  )

  fireEvent.click(screen.getByRole("button", { name: /review tool access/i }))

  expect(
    screen.getByRole("button", { name: "Open GitHub tools" })
  ).toBeDefined()
  expect(screen.getByRole("button", { name: "Open Slack tools" })).toBeDefined()
  expect(screen.getByText("Read 1")).toBeDefined()
  expect(screen.getByText("Write 1")).toBeDefined()
  expect(screen.queryByText("Read 0")).toBeNull()
  expect(screen.queryByText("Write 0")).toBeNull()
})

function executionWithApprovalTool(): ExecutionItem {
  return {
    approval: null,
    createdAt: 1700000000000,
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
    durationMs: 1000,
    endedAt: 1700000001000,
    id: "execution",
    searchableText: "",
    source: {
      type: "message",
      kind: { type: "reply", label: "reply" },
      surface: { type: "slack", label: "Slack" },
      metadata: [{ type: "channel", label: "#product" }],
    },
    status: "completed",
    task: "Create a Notion page.",
    title: "Create a Notion page.",
    trigger: "Slack message",
  }
}

function executionWithSingleAccessToolGroups(): ExecutionItem {
  return {
    approval: null,
    createdAt: 1700000000000,
    details: [
      {
        type: "tools",
        label: "GitHub · Read 1 · Slack · Write 1",
        groups: [
          {
            type: "github",
            label: "GitHub",
            tools: [
              {
                access: "read" as const,
                description: "Read GitHub issues.",
                label: "Read issue",
                tool: "github_get_issue",
              },
            ],
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
    durationMs: 1000,
    endedAt: 1700000001000,
    id: "execution",
    searchableText: "",
    source: {
      type: "message",
      kind: { type: "reply", label: "reply" },
      surface: { type: "slack", label: "Slack" },
      metadata: [{ type: "channel", label: "#product" }],
    },
    status: "completed",
    task: "Review tool access.",
    title: "Review tool access.",
    trigger: "Slack message",
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
