// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { activityItem } from "../../../../../test/activity"
import { ActivityItem, ActivityTimeline } from "./item"

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
  expect(document.querySelector('[data-slot="tooltip-trigger"]')).toBeNull()
})

test("renders integration offer descriptions as provider identity", () => {
  const summary = "Connect GitHub so Jori can inspect repositories."

  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          description: summary,
          integration: "github",
          kind: "offer",
          title: "Integration offer expired",
        })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(screen.getByText("Integration offer expired")).toBeDefined()
  expect(screen.getByText("GitHub")).toBeDefined()
  expect(screen.queryByText(summary)).toBeNull()
  expect(
    document.querySelector('img[src="/logos/integrations/github.svg"]')
  ).not.toBeNull()
})

test("shimmers live activity without a separate live indicator", () => {
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

  expect(screen.queryByRole("status", { name: "Running now" })).toBeNull()
  expect(screen.getByText("2s")).toBeDefined()
  expect(screen.getByText("Read file").className).toContain("shimmer")
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

  expect(screen.getByText("Run started").className).not.toContain("shimmer")
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

  expect(screen.getByText("2 actions · 2 results")).toBeDefined()

  fireEvent.click(group)

  expect(screen.getByText("Read file")).toBeDefined()
  expect(screen.getByText("Fetch page")).toBeDefined()
})

test("labels same-family tool groups with specific wording", () => {
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
          activityItem({
            id: "search-a",
            metadata: [{ kind: "target", text: "first query" }],
            title: "Search web",
          }),
          activityItem({
            id: "search-b",
            metadata: [{ kind: "target", text: "second query" }],
            title: "Search web",
          }),
        ]}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  const group = screen.getByRole("button", { name: /searched web/i })

  expect(group).toBeDefined()
  expect(screen.getByText("2 queries · 2 results")).toBeDefined()

  fireEvent.click(group)

  expect(screen.getByText("first query")).toBeDefined()
  expect(screen.getByText("second query")).toBeDefined()
})

test("shimmers active tool groups and expanded active subitems", () => {
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
          activityItem({
            durationMs: undefined,
            endedAt: undefined,
            id: "search-a",
            isLive: true,
            metadata: [{ kind: "target", text: "current query" }],
            status: "running",
            title: "Search web",
          }),
          activityItem({
            id: "search-b",
            metadata: [{ kind: "target", text: "previous query" }],
            title: "Search web",
          }),
        ]}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  const group = screen.getByRole("button", { name: /searching web/i })

  expect(screen.getByText("Searching web").className).toContain("shimmer")

  fireEvent.click(group)

  const activeSubitem = screen.getAllByText("Search web")[0]
  expect(activeSubitem.className).toContain("shimmer")
})
