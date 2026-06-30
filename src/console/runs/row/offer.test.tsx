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

test("pages through multiple integration offers", async () => {
  render(
    <TooltipProvider>
      <ExecutionRow
        execution={executionWithOffer({
          offers: [
            {
              expiresAt: 1700001800000,
              id: "offer-1",
              integration: "notion",
              integrationLabel: "Notion",
              state: "pending",
              summary: "Connect Notion so Milo can create the page.",
              updatedAt: 1700000001000,
            },
            {
              expiresAt: 1700001900000,
              id: "offer-2",
              integration: "slack",
              integrationLabel: "Slack",
              state: "pending",
              summary: "Connect Slack so Milo can send the update.",
              updatedAt: 1700000002000,
            },
          ],
        })}
        now={1700000001000}
        tenantId="tenant"
      />
    </TooltipProvider>
  )

  fireEvent.click(screen.getByRole("button", { name: /offer test/i }))

  await screen.findByText("Connect Notion so Milo can create the page.")

  fireEvent.click(
    screen.getByRole("button", { name: "Next integration offer" })
  )

  expect(screen.getByText("Connect Slack")).toBeDefined()
  expect(
    screen.getByText("Connect Slack so Milo can send the update.")
  ).toBeDefined()
  expect(
    screen.queryByText("Connect Notion so Milo can create the page.")
  ).toBeNull()
})

function executionWithOffer(
  overrides: Partial<Pick<ExecutionItem, "offer" | "offers">> = {}
): ExecutionItem {
  const offer = overrides.offer ??
    overrides.offers?.[0] ?? {
      expiresAt: 1700001800000,
      id: "offer",
      integration: "notion" as const,
      integrationLabel: "Notion",
      state: "pending" as const,
      summary: "Connect Notion so Milo can create the requested page.",
      updatedAt: 1700000001000,
    }

  return {
    approval: null,
    approvals: [],
    createdAt: 1700000000000,
    details: [],
    durationMs: 1000,
    endedAt: 1700000001000,
    id: "execution",
    offer,
    offers: overrides.offers ?? [offer],
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
