// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ExecutionRow } from "./row"
import { type ExecutionItem } from "./types"

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

test("renders recurring automation details", () => {
  renderExecutionRow(
    execution({
      task: "Generate a team image.",
      title: "Daily image",
      source: {
        type: "automation",
        provider: { type: "milo", label: "Milo" },
        kind: { type: "recurring", label: "recurring" },
        metadata: [{ type: "schedule", label: "Daily at 09:00 UTC" }],
      },
      details: [
        { type: "next", label: "Next", at: 1700125200000 },
        {
          type: "tools",
          label: "Slack · Read 1 · Write 1",
          groups: [
            {
              type: "slack",
              label: "Slack",
              tools: slackTools(),
            },
          ],
        },
        { type: "web_search", label: "Allowed" },
      ],
    })
  )

  fireEvent.click(screen.getByRole("button", { name: /daily image/i }))

  expect(screen.getByText("Milo")).toBeDefined()
  expect(screen.getByText("recurring")).toBeDefined()
  expect(screen.getByText("Daily at 09:00 UTC")).toBeDefined()
  expect(screen.queryByText("Schedule")).toBeNull()
  expect(screen.queryByText("Occurrence")).toBeNull()
  expect(screen.getByText("Next")).toBeDefined()
  expect(screen.getByText("Tools")).toBeDefined()
  expect(screen.getByRole("button", { name: "Open Slack tools" })).toBeDefined()
  expect(screen.getByText("Read 1")).toBeDefined()
  expect(screen.getByText("Write 1")).toBeDefined()
  expect(screen.getByText("Web search")).toBeDefined()
  expect(screen.getByText("Allowed")).toBeDefined()
})

function renderExecutionRow(item: ExecutionItem) {
  return render(
    <TooltipProvider>
      <ExecutionRow execution={item} now={1700000001000} tenantId="tenant" />
    </TooltipProvider>
  )
}

function execution(
  overrides: Pick<ExecutionItem, "task" | "title"> &
    Partial<Pick<ExecutionItem, "details" | "source">>
): ExecutionItem {
  return {
    approval: null,
    createdAt: 1700000000000,
    details: overrides.details ?? [],
    durationMs: 1000,
    finishedAt: 1700000001000,
    id: "execution",
    searchableText: "",
    source: overrides.source ?? {
      type: "automation",
      metadata: [],
    },
    status: "completed",
    task: overrides.task,
    title: overrides.title,
    trigger: "Time automation",
  }
}

function slackTools() {
  return [
    {
      access: "write" as const,
      description: "Post a Slack message.",
      label: "Send message",
      tool: "conversations_add_message",
    },
    {
      access: "read" as const,
      description: "Read Slack channel messages.",
      label: "Read channel history",
      tool: "conversations_history",
    },
  ]
}
