// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type Workstreams } from "../types"
import { WorkstreamsPulse } from "./pulse"

const pulse = vi.hoisted(() => {
  const observedAt = new Date(2026, 6, 13, 12).getTime()

  return {
    consolidationAt: null,
    days: 14 as const,
    entries: [
      { effort: "Alpha", observedAt, workstreamId: "alpha" },
      { effort: "Beta", observedAt, workstreamId: "beta" },
      { effort: "Waiting", observedAt, workstreamId: null },
    ],
    now: observedAt,
    reviewedAt: null,
    unplaced: 1,
  }
})
const originalResizeObserver = globalThis.ResizeObserver

vi.mock("convex/react", () => ({ useQuery: () => pulse }))

class TestResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

beforeAll(() => {
  globalThis.ResizeObserver = TestResizeObserver as typeof ResizeObserver
})

afterEach(() => {
  cleanup()
})

afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver
})

test("counts active workstream lanes without including unplaced", async () => {
  render(
    <TooltipProvider>
      <WorkstreamsPulse
        organizationId="organization"
        workstreams={workstreams}
        onOpen={() => undefined}
      />
    </TooltipProvider>
  )

  const count = await screen.findByText("(2)")

  expect(screen.getByText("Activity")).toBeDefined()
  expect(screen.getByRole("combobox", { name: "Activity range" })).toBeDefined()
  expect(count.className).toContain("font-normal")
  expect(count.className).toContain("text-muted-foreground/70")
})

const workstreams = [
  { id: "alpha", name: "Alpha" },
  { id: "beta", name: "Beta" },
] as Workstreams
