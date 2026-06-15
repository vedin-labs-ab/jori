// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type AutomationSurfaceIntegration } from "../access"
import { type Automation } from "../types"
import { AutomationToolSummary } from "./tools"

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
})

afterEach(() => {
  cleanup()
})

test("shows three integration logos when exactly three surfaces are connected", () => {
  const { container } = renderToolSummary(["github", "slack", "googleCalendar"])

  expect(container.querySelectorAll("img")).toHaveLength(3)
  expect(screen.queryByRole("button", { name: /\bmore integrations\b/i })).toBe(
    null
  )
  expect(screen.getByText("3 tools")).toBeDefined()
})

test("collapses additional integrations into a tooltip count", async () => {
  const { container } = renderToolSummary([
    "github",
    "slack",
    "googleCalendar",
    "googleDrive",
  ])

  expect(container.querySelectorAll("img")).toHaveLength(2)
  expect(screen.getByText("4 tools")).toBeDefined()

  const count = screen.getByRole("button", {
    name: "Show 2 more integrations: Google Calendar, Google Drive",
  })

  expect(count.textContent).toBe("+2")

  fireEvent.focus(count)

  expect(
    await screen.findAllByText("Google Calendar, Google Drive")
  ).not.toHaveLength(0)
})

function renderToolSummary(surfaces: AutomationSurfaceIntegration[]) {
  return render(
    <TooltipProvider>
      <AutomationToolSummary automation={automationWithSurfaces(surfaces)} />
    </TooltipProvider>
  )
}

function automationWithSurfaces(
  surfaces: AutomationSurfaceIntegration[]
): Automation {
  return {
    access: {
      surfaces: surfaces.map((integration) => ({
        integration,
        tools: [`${integration}_tool`],
      })),
    },
  } as Automation
}
