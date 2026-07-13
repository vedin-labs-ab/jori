// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ActivityItem } from "./item"
import { type ActivityItem as ActivityItemType } from "./types"

const originalResizeObserver = globalThis.ResizeObserver

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as typeof ResizeObserver
})

afterEach(() => {
  cleanup()
})

afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver
})

test("uses a static agent icon while wait_for_agents is parked", () => {
  renderActivity({
    durationMs: 200,
    isLive: false,
    metadata: [{ kind: "outcome", text: "2 ongoing" }],
    status: "waiting",
    title: "Wait for agents",
    tool: "wait_for_agents",
  })

  const icon = screen.getByRole("img", { name: "Tool waiting" })

  expect(icon.querySelector("svg")?.classList.contains("lucide-bot")).toBe(true)
  expect(screen.getByText("Wait for agents").className).not.toContain("shimmer")
  expect(screen.getByText("2 ongoing")).toBeDefined()
})

test("uses the shared skill icon for load_skill", () => {
  renderActivity({
    description: "slack",
    title: "Load skill",
    tool: "load_skill",
  })

  const icon = screen.getByRole("img", { name: "Tool done" })

  expect(
    icon.querySelector("svg")?.classList.contains("lucide-book-open")
  ).toBe(true)
})

function renderActivity(overrides: Partial<ActivityItemType>) {
  render(
    <TooltipProvider>
      <ActivityItem item={activityItem(overrides)} now={1700000002000} />
    </TooltipProvider>
  )
}

function activityItem(overrides: Partial<ActivityItemType>): ActivityItemType {
  return {
    access: "read",
    description: "src/app.tsx",
    durationMs: 1200,
    endedAt: 1700000001200,
    id: "activity",
    kind: "tool",
    startedAt: 1700000000000,
    status: "completed",
    title: "Read file",
    ...overrides,
  }
}
