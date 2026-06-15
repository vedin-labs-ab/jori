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
  expectWebStatus(container, "allowed", "text-primary")
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

test("shows blocked web search state", () => {
  const { container } = renderToolSummary(["slack"], false)

  expectWebStatus(container, "blocked", "text-destructive")
})

function renderToolSummary(
  surfaces: AutomationSurfaceIntegration[],
  webSearch = true
) {
  return render(
    <TooltipProvider>
      <AutomationToolSummary
        automation={automationWithSurfaces(surfaces, webSearch)}
      />
    </TooltipProvider>
  )
}

function automationWithSurfaces(
  surfaces: AutomationSurfaceIntegration[],
  webSearch: boolean
): Automation {
  return {
    access: {
      webSearch,
      surfaces: surfaces.map((integration) => ({
        integration,
        tools: [`${integration}_tool`],
      })),
    },
  } as Automation
}

function hasTextContent(text: string) {
  return (_content: string, element: Element | null) =>
    element?.textContent === text
}

function expectWebStatus(
  container: HTMLElement,
  state: "allowed" | "blocked",
  stateClassName: string
) {
  const label = screen
    .getAllByText(hasTextContent(`Web ${state}`))
    .find(
      (element) =>
        typeof element.className === "string" &&
        element.className.includes("text-foreground")
    )
  const iconClassName = container.querySelector("svg")?.getAttribute("class")

  expect(label).toBeDefined()
  expect(screen.getByText(state).className).toContain(stateClassName)
  expect(iconClassName).toContain("text-muted-foreground")
  expect(iconClassName).not.toContain(stateClassName)
}
