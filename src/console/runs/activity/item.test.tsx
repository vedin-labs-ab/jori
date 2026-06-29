// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ActivityItem, ActivityTimeline } from "./item"
import { type ActivityItem as ActivityItemType } from "./types"

afterEach(() => {
  cleanup()
})

test("renders a compact non-collapsible activity item", () => {
  render(
    <TooltipProvider>
      <ActivityItem item={activityItem()} now={1700000002000} />
    </TooltipProvider>
  )

  expect(screen.getByText("Read file")).toBeDefined()
  expect(screen.getByText("src/app.tsx")).toBeDefined()
  expect(screen.getByText("1s")).toBeDefined()
  expect(screen.queryByRole("button", { name: /read file/i })).toBeNull()
  expect(screen.queryByText("Path")).toBeNull()
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

test("groups consecutive tool calls into an expandable task", () => {
  render(
    <TooltipProvider>
      <ActivityTimeline
        items={[
          activityItem({
            description: undefined,
            id: "run-started",
            kind: "run",
            title: "Run started",
          }),
          activityItem({ id: "read", title: "Read file" }),
          activityItem({
            description: "https://example.com",
            id: "fetch",
            title: "Fetch page",
          }),
        ]}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  const group = screen.getByRole("button", { name: /ran 2 actions/i })

  expect(group).toBeDefined()
  expect(screen.getByText("2 actions · 2 results")).toBeDefined()

  fireEvent.click(group)

  expect(screen.getByText("Read file")).toBeDefined()
  expect(screen.getByText("Fetch page")).toBeDefined()
})

function activityItem(
  overrides: Partial<ActivityItemType> = {}
): ActivityItemType {
  return {
    access: "read",
    description: "src/app.tsx",
    details: [{ label: "Path", value: "src/app.tsx" }],
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
