// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, test } from "vitest"
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

describe("execution row details", () => {
  test("renders the execution task", () => {
    renderExecutionRow(
      execution({
        task: "Summarize the Notion launch plan.",
        title: "Notion test",
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    expect(screen.getByText("Task")).toBeDefined()
    expect(screen.getByText("Summarize the Notion launch plan.")).toBeDefined()
  })

  test("does not render the title as the task", () => {
    renderExecutionRow(
      execution({
        task: "Use the Notion page context to update the team.",
        title: "Notion test",
      })
    )

    const titleCount = screen.getAllByText("Notion test").length

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    expect(
      screen.getByText("Use the Notion page context to update the team.")
    ).toBeDefined()
    expect(screen.getAllByText("Notion test")).toHaveLength(titleCount)
  })
})

function renderExecutionRow(item: ExecutionItem) {
  return render(
    <TooltipProvider>
      <ExecutionRow execution={item} now={1700000001000} tenantId="tenant" />
    </TooltipProvider>
  )
}

function execution(
  overrides: Pick<ExecutionItem, "task" | "title">
): ExecutionItem {
  return {
    approval: null,
    createdAt: 1700000000000,
    durationMs: 1000,
    finishedAt: 1700000001000,
    id: "execution",
    searchableText: "",
    source: {
      type: "automation",
      provider: { type: "slack", label: "Slack" },
      event: { type: "message.created", label: "New channel message" },
      facts: [],
    },
    status: "completed",
    task: overrides.task,
    title: overrides.title,
    trigger: "Slack event",
  }
}
