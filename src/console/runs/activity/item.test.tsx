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
  expect(screen.getByText("1s")).toBeDefined()

  fireEvent.click(row)

  expect(screen.getByText("Path")).toBeDefined()
  expect(screen.getAllByText("src/app.tsx").length).toBeGreaterThan(1)
})

function activityItem(): ActivityItemType {
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
  }
}
