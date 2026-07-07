// @vitest-environment jsdom
import { playbookCatalog } from "@contracts/playbooks/catalog"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PlaybookCard } from "./card"
import { type PlaybookActions } from "./enable"
import { type PlaybookListRow } from "./state"

afterEach(() => {
  cleanup()
})

const morningBrief = playbookCatalog[0]

test("active card puts the switch in the header and run-now in the footer", () => {
  renderCard(enabledRow("active", Date.now() + 2 * 60 * 60 * 1000))

  expect(
    screen.getByRole("switch", { name: "Morning brief enabled" })
  ).toBeDefined()
  expect(screen.getByText("On")).toBeDefined()
  expect(screen.getByRole("button", { name: /run now/i })).toBeDefined()
  expect(screen.getByText(/Next in 2h/)).toBeDefined()
  expect(screen.getByText("Schedule")).toBeDefined()
  expect(screen.getByText("Tools")).toBeDefined()
})

test("paused card shows paused state and no next run", () => {
  renderCard(enabledRow("paused"))

  expect(
    screen.getByRole("switch", { name: "Morning brief enabled" })
  ).toBeDefined()
  expect(screen.getByText("Paused")).toBeDefined()
  expect(screen.queryByText(/Next in/)).toBeNull()
})

test("disabled card offers try-once and enable without a switch", () => {
  renderCard(disabledRow())

  expect(screen.getByRole("button", { name: /try once/i })).toBeDefined()
  expect(screen.getByRole("button", { name: "Enable" })).toBeDefined()
  expect(screen.queryByRole("switch")).toBeNull()
})

function renderCard(row: PlaybookListRow) {
  const router = createRouter({
    history: createMemoryHistory(),
    routeTree: createRootRoute(),
  })

  return render(
    <RouterContextProvider router={router}>
      <TooltipProvider>
        <PlaybookCard
          actions={stubActions()}
          definition={morningBrief}
          row={row}
        />
      </TooltipProvider>
    </RouterContextProvider>
  )
}

function stubActions(): PlaybookActions {
  return {
    pending: undefined,
    enable: vi.fn(async () => {}),
    trial: vi.fn(async () => {}),
    runNow: vi.fn(async () => {}),
    setPaused: vi.fn(async () => {}),
  }
}

function disabledRow(): PlaybookListRow {
  return { ...enabledRow("active"), enabled: null }
}

function enabledRow(
  status: "active" | "paused",
  nextRunAt?: number
): PlaybookListRow {
  return {
    key: morningBrief.key,
    slots: [
      { capability: "email", connected: ["gmail"] },
      { capability: "calendar", connected: ["googleCalendar"] },
    ],
    enabled: {
      automationId: "automation-1" as NonNullable<
        PlaybookListRow["enabled"]
      >["automationId"],
      status,
      nextRunAt,
    },
  }
}
