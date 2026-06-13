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

afterEach(cleanup)

describe("execution row details", () => {
  test("renders automation instructions instead of the automation title", () => {
    renderExecutionRow(
      execution({
        objective: "Create a Notion page when the event arrives.",
        objectiveLabel: "Instructions",
        title: "Notion test",
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    expect(screen.getByText("Instructions")).toBeDefined()
    expect(
      screen.getByText("Create a Notion page when the event arrives.")
    ).toBeDefined()
  })

  test("does not render the title as a prompt fallback", () => {
    renderExecutionRow(
      execution({ objective: undefined, title: "Notion test" })
    )

    const titleCount = screen.getAllByText("Notion test").length

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    expect(screen.queryByText("Prompt")).toBeNull()
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
  overrides: Pick<ExecutionItem, "objective" | "title"> &
    Partial<Pick<ExecutionItem, "objectiveLabel">>
): ExecutionItem {
  return {
    approval: null,
    createdAt: 1700000000000,
    durationMs: 1000,
    finishedAt: 1700000001000,
    id: "execution",
    objective: overrides.objective,
    objectiveLabel: overrides.objectiveLabel,
    searchableText: "",
    sourceParts: [
      "Triggered by event:",
      "Slack",
      "event:",
      "New channel message",
      "for automation:",
      overrides.title,
    ],
    status: "completed",
    title: overrides.title,
    trigger: "Slack event",
  }
}
