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

describe("execution row task details", () => {
  test("renders the execution task", () => {
    renderExecutionRow(
      execution({
        task: "Summarize the Notion launch plan.",
        title: "Notion test",
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    expect(screen.getAllByText("Task")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Copy Task" })).toBeDefined()
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

describe("execution row linked details", () => {
  test("renders execution details with links", () => {
    renderExecutionRow(
      execution({
        task: "Review the issue comment.",
        title: "GitHub test",
        details: [
          {
            type: "repository",
            label: "vedin-labs/frontier",
            url: "https://github.com/vedin-labs/frontier",
          },
          {
            type: "comment",
            label: "Can you check this failure?",
            url: "https://github.com/vedin-labs/frontier/issues/12#comment",
          },
        ],
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /github test/i }))

    expect(screen.getByText("Repository")).toBeDefined()
    expect(screen.getByText("Comment")).toBeDefined()
    const repositoryLink = screen.getByRole("link", {
      name: /vedin-labs\/frontier/i,
    })
    const commentSourceLink = screen.getByRole("link", {
      name: /open comment/i,
    })
    const commentBody = screen.getByText("Can you check this failure?")

    expect(repositoryLink.getAttribute("href")).toBe(
      "https://github.com/vedin-labs/frontier"
    )
    expect(repositoryLink.closest(".bg-muted")).toBeNull()
    expect(commentSourceLink.getAttribute("href")).toBe(
      "https://github.com/vedin-labs/frontier/issues/12#comment"
    )
    expect(commentBody.closest(".bg-muted")).not.toBeNull()
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
  overrides: Pick<ExecutionItem, "task" | "title"> &
    Partial<Pick<ExecutionItem, "details">>
): ExecutionItem {
  return {
    approval: null,
    createdAt: 1700000000000,
    details: overrides.details ?? [],
    durationMs: 1000,
    finishedAt: 1700000001000,
    id: "execution",
    searchableText: "",
    source: {
      type: "automation",
      provider: { type: "slack", label: "Slack" },
      event: { type: "message.created", label: "New channel message" },
      metadata: [],
    },
    status: "completed",
    task: overrides.task,
    title: overrides.title,
    trigger: "Slack event",
  }
}
