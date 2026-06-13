// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest"
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
  vi.unstubAllGlobals()
})

describe("execution row details", () => {
  test("renders the stored execution prompt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("Stored execution prompt.")))
    )

    renderExecutionRow(
      execution({
        promptUrl: "https://example.com/prompt",
        title: "Notion test",
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    expect(screen.getByText("Prompt")).toBeDefined()
    expect(await screen.findByText("Stored execution prompt.")).toBeDefined()
  })

  test("does not render the title as a prompt fallback", () => {
    renderExecutionRow(
      execution({ promptUrl: undefined, title: "Notion test" })
    )

    const titleCount = screen.getAllByText("Notion test").length

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    expect(screen.getByText("Prompt file is missing.")).toBeDefined()
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
  overrides: Pick<ExecutionItem, "promptUrl" | "title">
): ExecutionItem {
  return {
    approval: null,
    createdAt: 1700000000000,
    durationMs: 1000,
    finishedAt: 1700000001000,
    id: "execution",
    promptUrl: overrides.promptUrl,
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
