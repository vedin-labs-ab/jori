// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ActivityTimeline } from "./item"
import { type ActivityItem as ActivityItemType } from "./types"

afterEach(() => {
  cleanup()
})

test("keeps task labels consistent and hover affordance scoped to groups", () => {
  render(
    <TooltipProvider>
      <ActivityTimeline
        items={[
          activityItem({ id: "search-a", title: "Search web" }),
          activityItem({ id: "search-b", title: "Search web" }),
          activityItem({
            id: "model",
            kind: "model",
            title: "Model step completed",
          }),
        ]}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(screen.getByText("Searched web").className).toContain(
    "text-foreground"
  )
  expect(screen.getByText("Model step completed").className).toContain(
    "text-foreground"
  )
  expect(groupIconClass()).toContain(
    "group-hover/activity-task-row:text-foreground"
  )
  expect(hasExactGroupIconClass("text-foreground")).toBe(false)
  expect(modelIconClass()).not.toContain(
    "group-hover/activity-task-row:text-foreground"
  )

  fireEvent.click(screen.getByRole("button", { name: /searched web/i }))

  expect(hasExactGroupIconClass("text-foreground")).toBe(true)
})

function groupIconClass() {
  return (
    screen.getByRole("img", { name: "Tool done" }).querySelector("svg")
      ?.className.baseVal ?? ""
  )
}

function hasExactGroupIconClass(className: string) {
  return groupIconClass().split(/\s+/).includes(className)
}

function modelIconClass() {
  return (
    screen.getByRole("img", { name: "Model done" }).querySelector("svg")
      ?.className.baseVal ?? ""
  )
}

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
