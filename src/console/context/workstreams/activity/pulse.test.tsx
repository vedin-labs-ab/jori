// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
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
vi.mock("convex/react", () => ({ useQuery: () => pulse }))

afterEach(() => {
  cleanup()
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

  expect(await screen.findByText("(2)")).toBeDefined()

  expect(screen.getByText("Activity")).toBeDefined()
  expect(screen.getByRole("combobox", { name: "Activity range" })).toBeDefined()
})

const workstreams = [
  { id: "alpha", name: "Alpha" },
  { id: "beta", name: "Beta" },
] as Workstreams
