// @vitest-environment jsdom
import { getPlaybook } from "@contracts/playbooks/catalog"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PlaybookCard } from "./card"
import { stubPlaybookActions } from "./fixtures"
import { type PlaybookListRow } from "./state"

afterEach(() => {
  cleanup()
})

const briefing = getPlaybook("meeting-briefing")

test("active card puts the switch in the header and run-now in the footer", () => {
  renderCard(enabledRow("active", Date.now() + 2 * 60 * 60 * 1000))

  expect(
    screen.getByRole("switch", { name: "Meeting Briefing enabled" })
  ).toBeDefined()
  expect(screen.getByText("On")).toBeDefined()
  expect(screen.getByRole("button", { name: /run now/i })).toBeDefined()
  expect(screen.getByRole("button", { name: "View" })).toBeDefined()
  expect(screen.getByText(/Next in 2h/)).toBeDefined()
  expect(screen.getByText("Schedule")).toBeDefined()
  expect(screen.getByText("Access")).toBeDefined()
})

test("paused card shows paused state and no next run", () => {
  renderCard(enabledRow("paused"))

  expect(
    screen.getByRole("switch", { name: "Meeting Briefing enabled" })
  ).toBeDefined()
  expect(screen.getByText("Paused")).toBeDefined()
  expect(screen.queryByText(/Next in/)).toBeNull()
})

test("enabled card with a lost connection offers reconnect over run-now", () => {
  renderCard(enabledRow("active", undefined, ["gmail"]))

  expect(screen.getByRole("link", { name: "Connect Gmail" })).toBeDefined()
  expect(screen.queryByRole("button", { name: /run now/i })).toBeNull()
  expect(screen.getByRole("button", { name: "View" })).toBeDefined()
  expect(
    screen.getByRole("switch", { name: "Meeting Briefing enabled" })
  ).toBeDefined()
})

test("disabled card offers a single enable entry without a switch", () => {
  renderCard(disabledRow())

  expect(screen.getByRole("button", { name: "Enable" })).toBeDefined()
  expect(screen.queryByRole("button", { name: /try once/i })).toBeNull()
  expect(screen.queryByRole("switch")).toBeNull()
})

function renderCard(row: PlaybookListRow, actions = stubPlaybookActions()) {
  const router = createRouter({
    history: createMemoryHistory(),
    routeTree: createRootRoute(),
  })

  return render(
    <RouterContextProvider router={router}>
      <TooltipProvider>
        <PlaybookCard
          actions={actions}
          definition={briefing}
          row={row}
          organizationId="organization"
        />
      </TooltipProvider>
    </RouterContextProvider>
  )
}

function disabledRow(): PlaybookListRow {
  return { ...enabledRow("active"), enabled: null }
}

function enabledRow(
  status: "active" | "paused",
  nextRunAt?: number,
  missing: NonNullable<PlaybookListRow["enabled"]>["missing"] = []
): PlaybookListRow {
  return {
    key: briefing.key,
    slots: [
      { capability: "email", connected: ["gmail"] },
      { capability: "calendar", connected: ["googleCalendar"] },
    ],
    delivery: {
      options: [
        { mode: "dm", available: true },
        { mode: "email", available: true },
        { mode: "channel", available: true },
      ],
      recommended: { kind: "slack", target: { kind: "dm" } },
    },
    enabled: {
      automationId: "automation-1" as NonNullable<
        PlaybookListRow["enabled"]
      >["automationId"],
      status,
      nextRunAt,
      missing,
      setup: null,
      app: null,
    },
  }
}
