// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { activityItem } from "../../../../../test/activity"
import { ActivityTimeline } from "./item"

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
