// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ExecutionApproval, type ExecutionItem } from "../types"
import { ExecutionRow } from "./index"

vi.mock("convex/react", () => ({
  useAction: () => vi.fn(),
  useMutation: () => vi.fn(),
  useQuery: () => ({ items: [], status: "loaded" }),
}))

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

test("pages through multiple approval requests", async () => {
  const firstApproval = approval({
    id: "approval-1",
    summary: "Send the requested Slack update.",
    toolLabel: "Send Slack message",
  })
  const secondApproval = approval({
    id: "approval-2",
    summary: "Create the requested Notion page.",
    toolLabel: "Create Notion page",
  })

  renderExecutionRow([firstApproval, secondApproval])

  fireEvent.click(screen.getByRole("button", { name: /approval test/i }))

  await screen.findByText("Send the requested Slack update.")

  const count = screen.getByText("2")

  expect(screen.getByText("Approvals")).toBeDefined()
  expect(count.className).toContain("font-normal")
  expect(count.className).toContain("text-[0.625rem]")
  expect(count.className).toContain("text-muted-foreground")

  fireEvent.click(screen.getByRole("button", { name: "Next approval" }))

  expect(screen.getByText("Create the requested Notion page.")).toBeDefined()
  expect(screen.queryByText("Send the requested Slack update.")).toBeNull()
})

function renderExecutionRow(approvals: ExecutionApproval[]) {
  return render(
    <TooltipProvider>
      <ExecutionRow
        execution={execution(approvals)}
        now={1700000001000}
        tenantId="tenant"
      />
    </TooltipProvider>
  )
}

function execution(approvals: ExecutionApproval[]): ExecutionItem {
  return {
    approval: approvals[0] ?? null,
    approvals,
    createdAt: 1700000000000,
    details: [],
    durationMs: 1000,
    endedAt: 1700000001000,
    id: "execution",
    offer: null,
    offers: [],
    searchableText: "",
    source: { type: "automation", surface: "slack" },
    status: "completed",
    task: "Handle the requested actions.",
    title: "Approval test",
    trigger: "Slack event",
  }
}

function approval(
  overrides: Pick<ExecutionApproval, "id" | "summary" | "toolLabel">
): ExecutionApproval {
  return {
    decidedAt: 1700000001000,
    expiresAt: 1700001800000,
    surface: "slack",
    state: "approved",
    tool: "conversations_add_message",
    ...overrides,
  }
}
