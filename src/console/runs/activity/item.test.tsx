// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ActivityItem } from "./item"
import { type ActivityItem as ActivityItemType } from "./types"

afterEach(() => {
  cleanup()
})

test("expands activity details from the row control", () => {
  render(
    <TooltipProvider>
      <ActivityItem item={activityItem()} now={1700000002000} />
    </TooltipProvider>
  )

  const row = screen.getByRole("button", { name: /read file/i })

  expect(screen.queryByText("Path")).toBeNull()
  expect(screen.queryByText("done")).toBeNull()
  expect(screen.queryByRole("status", { name: "Running now" })).toBeNull()
  expect(screen.getByText("1s")).toBeDefined()

  fireEvent.click(row)

  expect(screen.getByText("Path")).toBeDefined()
  expect(screen.getByText("Path").closest("div")?.className).not.toContain(
    "border-t"
  )
  expect(screen.getAllByText("src/app.tsx").length).toBeGreaterThan(1)
})

test("shows a live indicator only for live activity", () => {
  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          durationMs: undefined,
          isLive: true,
          status: "running",
        })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(screen.getByRole("status", { name: "Running now" })).toBeDefined()
})

test("does not pulse historical running-status events", () => {
  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          details: undefined,
          durationMs: undefined,
          kind: "run",
          status: "running",
          title: "Run started",
        })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(screen.queryByRole("status", { name: "Running now" })).toBeNull()
})

function activityItem(
  overrides: Partial<ActivityItemType> = {}
): ActivityItemType {
  return {
    access: "read",
    description: "src/app.tsx",
    details: [{ label: "Path", value: "src/app.tsx" }],
    durationMs: 1200,
    id: "activity",
    kind: "tool",
    startedAt: 1700000000000,
    status: "completed",
    title: "Read file",
    ...overrides,
  }
}
