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
import { digestPlaybook } from "../../../test/playbooks"
import { PlaybookCard } from "./card"
import { stubPlaybookActions } from "./fixtures"
import { type PlaybookListRow } from "./state"

afterEach(() => {
  cleanup()
})

test("active card puts the switch in the header and run-now in the footer", () => {
  renderCard(enabledRow("active", Date.now() + 2 * 60 * 60 * 1000))

  expect(
    screen.getByRole("switch", { name: "Daily Digest enabled" })
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
    screen.getByRole("switch", { name: "Daily Digest enabled" })
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
    screen.getByRole("switch", { name: "Daily Digest enabled" })
  ).toBeDefined()
})

test("disabled card offers a single enable entry without a switch", () => {
  renderCard(disabledRow())

  expect(screen.getByRole("button", { name: "Enable" })).toBeDefined()
  expect(screen.queryByRole("button", { name: /try once/i })).toBeNull()
  expect(screen.queryByRole("switch")).toBeNull()
})

const preread = getPlaybook("preread")

test("access lists Jori-level tools alongside integrations", () => {
  renderCard(prereadRow(), preread)

  expect(screen.getByText("Access")).toBeDefined()
  expect(screen.getByText("Workstream memory")).toBeDefined()
})

test("access section disappears entirely when the playbook needs nothing", () => {
  renderCard(prereadRow(), { ...preread, jori: [] })

  expect(screen.queryByText("Access")).toBeNull()
})

function renderCard(row: PlaybookListRow, definition = digestPlaybook) {
  const router = createRouter({
    history: createMemoryHistory(),
    routeTree: createRootRoute(),
  })

  return render(
    <RouterContextProvider router={router}>
      <TooltipProvider>
        <PlaybookCard
          actions={stubPlaybookActions()}
          definition={definition}
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

function prereadRow(): PlaybookListRow {
  return {
    key: preread.key,
    slots: [],
    delivery: {
      options: [{ mode: "channel", available: true }],
      recommended: {
        kind: "slack",
        target: { kind: "channel", id: "channel-1", label: "#general" },
      },
    },
    enabled: null,
  }
}

function enabledRow(
  status: "active" | "paused",
  nextRunAt?: number,
  missing: NonNullable<PlaybookListRow["enabled"]>["missing"] = []
): PlaybookListRow {
  return {
    key: digestPlaybook.key,
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
    },
  }
}
