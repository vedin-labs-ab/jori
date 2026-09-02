// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { activityItem } from "../../../../../test/activity"
import { ActivityItem, ActivityTimeline } from "./item"

afterEach(() => {
  cleanup()
})

test("keeps failed search metadata compact and hides raw details", () => {
  const error = "Server Error Uncaught Error: web_search failed"
  const query = "site:theverge.com OR site:techcrunch.com OR site:reuters.com"

  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          description: error,
          details: [{ label: "Error", value: error }],
          metadata: [
            { kind: "target", text: query },
            { kind: "scope", text: "in theverge.com, techcrunch.com" },
          ],
          status: "failed",
          title: "Search web failed",
        })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(screen.getByText("Search web failed")).toBeDefined()
  expect(screen.getByText("1 query · 1 error")).toBeDefined()
  expect(screen.getByRole("button", { name: /show error/i })).toBeDefined()
  expect(screen.queryByText(error)).toBeNull()
  expect(screen.queryByText(query)).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: /show error/i }))

  expect(
    screen.getByRole("dialog", { name: "Search web failed" })
  ).toBeDefined()
  expect(screen.queryByText("Error details")).toBeNull()
  expect(screen.queryByRole("button", { name: /close/i })).toBeNull()
  expect(screen.getByText(error)).toBeDefined()
})

test("uses error counts for failed tools in same-family groups", () => {
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
            description: "Search provider failed",
            details: [{ label: "Error", value: "Search provider failed" }],
            id: "search-b",
            metadata: [{ kind: "target", text: "second query" }],
            status: "failed",
            title: "Search web failed",
          }),
        ]}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  const group = screen.getByRole("button", { name: /searched web/i })

  expect(screen.getByText("2 queries · 1 result · 1 error")).toBeDefined()

  fireEvent.click(group)

  expect(screen.getByText("1 query · 1 error")).toBeDefined()
  expect(screen.queryByText("second query")).toBeNull()
})
