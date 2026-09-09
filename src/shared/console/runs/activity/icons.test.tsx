// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { activityItem } from "../../../../../test/activity"
import { ActivityItem } from "./item"
import { type ActivityItem as ActivityItemType } from "./types"

afterEach(() => {
  cleanup()
})

test("uses a bookmark while wait_for_agents is parked", () => {
  renderActivity({
    durationMs: 200,
    isLive: false,
    metadata: [{ kind: "outcome", text: "2 ongoing" }],
    status: "waiting",
    title: "Wait for agents",
    tool: "wait_for_agents",
  })

  const icon = screen.getByRole("img", { name: "Tool waiting" })

  expect(icon.querySelector("svg")?.classList.contains("lucide-bookmark")).toBe(
    true
  )
  expect(screen.getByText("Wait for agents").className).not.toContain("shimmer")
  expect(screen.getByText("2 ongoing")).toBeDefined()
})

test("uses a checked bookmark when every agent succeeded", () => {
  renderActivity({
    metadata: [{ kind: "outcome", text: "2 succeeded" }],
    status: "completed",
    title: "Wait for agents",
    tool: "wait_for_agents",
  })

  const icon = screen.getByRole("img", { name: "Tool done" })

  expect(
    icon.querySelector("svg")?.classList.contains("lucide-bookmark-check")
  ).toBe(true)
})

test("keeps the bookmark after a timeout while agents are ongoing", () => {
  renderActivity({
    metadata: [
      { kind: "outcome", text: "1 ongoing" },
      { kind: "outcome", text: "1 succeeded" },
    ],
    status: "completed",
    title: "Wait for agents",
    tool: "wait_for_agents",
  })

  const icon = screen.getByRole("img", { name: "Tool done" })

  expect(icon.querySelector("svg")?.classList.contains("lucide-bookmark")).toBe(
    true
  )
})

test("uses an x bookmark when any agent was unsuccessful", () => {
  renderActivity({
    metadata: [
      { kind: "outcome", text: "1 succeeded" },
      { kind: "outcome", text: "1 failed" },
    ],
    status: "completed",
    title: "Wait for agents",
    tool: "wait_for_agents",
  })

  const icon = screen.getByRole("img", { name: "Tool done" })

  expect(
    icon.querySelector("svg")?.classList.contains("lucide-bookmark-x")
  ).toBe(true)
})

function renderActivity(overrides: Partial<ActivityItemType>) {
  render(
    <TooltipProvider>
      <ActivityItem item={activityItem(overrides)} now={1700000002000} />
    </TooltipProvider>
  )
}
