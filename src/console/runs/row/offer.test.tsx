// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ExecutionItem } from "../types"
import { ExecutionRow } from "./index"

vi.mock("convex/react", () => ({
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

test("renders live integration offers like action requests", async () => {
  render(
    <TooltipProvider>
      <ExecutionRow
        execution={executionWithOffer()}
        now={1700000001000}
        tenantId="tenant"
      />
    </TooltipProvider>
  )

  expect(screen.getByText("Needs action")).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: /offer test/i }))

  await screen.findByText("Offer")

  expect(screen.getByText("Connect Notion")).toBeDefined()
  expect(
    screen.getByText("Connect Notion so Milo can create the requested page.")
  ).toBeDefined()
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Connect" })).toBeDefined()
})

function executionWithOffer(): ExecutionItem {
  return {
    approval: null,
    createdAt: 1700000000000,
    details: [],
    durationMs: 1000,
    endedAt: 1700000001000,
    id: "execution",
    offer: {
      expiresAt: 1700001800000,
      id: "offer",
      integration: "notion",
      integrationLabel: "Notion",
      state: "pending",
      summary: "Connect Notion so Milo can create the requested page.",
      updatedAt: 1700000001000,
    },
    searchableText: "",
    source: {
      type: "automation",
      surface: "slack",
    },
    status: "completed",
    task: "Create a Notion page.",
    title: "Offer test",
    trigger: "Slack event",
  }
}
