// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { activityItem } from "../../../../../test/activity"
import { ActivityTimeline } from "./item"

afterEach(() => {
  cleanup()
})

const liveItem = activityItem({
  durationMs: undefined,
  endedAt: undefined,
  id: "live",
  isLive: true,
  status: "running",
  title: "Search web",
})

const settledItem = activityItem({
  description: "Thinking",
  id: "settled",
  kind: "model",
  title: "Model turn",
})

// Settled rows are handed a fixed clock so their memoized rows can skip the
// tick entirely. What that must not change: the live row still counts up,
// and the settled row still shows the duration it finished with.
test("advances the live entry's duration while settled entries hold theirs", () => {
  const timeline = (now: number) => (
    <TooltipProvider>
      <ActivityTimeline items={[liveItem, settledItem]} now={now} />
    </TooltipProvider>
  )
  const view = render(timeline(1700000002000))

  expect(screen.getByText("2s")).toBeDefined()
  expect(screen.getByText("1s")).toBeDefined()

  view.rerender(timeline(1700000007000))

  expect(screen.getByText("7s")).toBeDefined()
  expect(screen.getByText("1s")).toBeDefined()
  expect(screen.queryByText("2s")).toBeNull()
})
