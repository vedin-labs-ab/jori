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
  expect(screen.queryByText("just now")).toBeNull()
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
  expect(screen.getByText("2s")).toBeDefined()
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

test("renders model token usage instead of selected action text", () => {
  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          description: "Selected 1 action.",
          kind: "model",
          title: "Model step completed",
          tokenUsage: {
            input: 1200,
            output: 80,
            reasoning: 20,
            total: 1300,
          },
        })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(
    screen.getByText(/in 1.2K · out 80 · reasoning 20 · total 1.3K/)
  ).toBeDefined()
  expect(screen.queryByText("Selected 1 action.")).toBeNull()
})

test("omits low-value send reply result descriptions", () => {
  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          description: "Returned object (1).",
          title: "Send reply",
        })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(screen.getByText("Send reply")).toBeDefined()
  expect(screen.queryByText("Returned object (1).")).toBeNull()
})

test("renders compact tool metadata instead of generic descriptions", () => {
  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          description: "Returned object (3).",
          metadata: [
            { kind: "target", text: "current example" },
            { kind: "outcome", text: "3 results" },
          ],
          title: "Search web",
        })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(screen.getByText("current example")).toBeDefined()
  expect(screen.getByText("3 results")).toBeDefined()
  expect(screen.queryByText("Returned object (3).")).toBeNull()
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
