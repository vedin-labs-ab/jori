// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ActivityTimeline } from "./item"
import { type ActivityItem } from "./types"

afterEach(() => {
  cleanup()
})

test("labels same-family reaction groups with specific wording", () => {
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
            id: "reaction-a",
            metadata: [{ kind: "target", text: "👍" }],
            title: "Add reaction",
          }),
          activityItem({
            id: "reaction-b",
            metadata: [{ kind: "target", text: "✅" }],
            title: "Add reaction",
          }),
        ]}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  const group = screen.getByRole("button", { name: /added reactions/i })

  expect(group).toBeDefined()
  expect(screen.getByText("2 reactions · 2 results")).toBeDefined()
})

function activityItem(overrides: Partial<ActivityItem> = {}): ActivityItem {
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
