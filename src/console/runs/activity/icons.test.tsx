// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
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

test("uses a branch icon for delegated agents", () => {
  renderActivity({
    description: "Prepare a meeting dossier",
    kind: "agent",
    status: "running",
    title: "Agent running",
  })

  const icon = screen.getByRole("img", { name: "Agent running" })

  expect(
    icon.querySelector("svg")?.classList.contains("lucide-git-branch")
  ).toBe(true)
})

test("uses the shared skill icon for load_skill", () => {
  renderActivity({
    description: "slack",
    title: "Load skill",
    tool: "load_skill",
  })

  const icon = screen.getByRole("img", { name: "Tool done" })

  expect(
    icon.querySelector("svg")?.classList.contains("lucide-book-open")
  ).toBe(true)
})

test("uses a terminal icon for bash", () => {
  renderActivity({
    description: "date -u +%Y-%m-%dT%H:%M:%SZ",
    title: "Run command",
    tool: "bash",
  })

  const icon = screen.getByRole("img", { name: "Tool done" })

  expect(icon.querySelector("svg")?.classList.contains("lucide-terminal")).toBe(
    true
  )
})

test("uses the shared link icon for share_file", () => {
  renderActivity({
    title: "Share file",
    tool: "share_file",
  })

  const icon = screen.getByRole("img", { name: "Tool done" })

  expect(icon.querySelector("svg")?.classList.contains("lucide-link-2")).toBe(
    true
  )
})

function renderActivity(overrides: Partial<ActivityItemType>) {
  render(
    <TooltipProvider>
      <ActivityItem item={activityItem(overrides)} now={1700000002000} />
    </TooltipProvider>
  )
}

function activityItem(overrides: Partial<ActivityItemType>): ActivityItemType {
  return {
    access: "read",
    description: "src/app.tsx",
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
