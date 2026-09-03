// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type JobSurfaceIntegration } from "../access"
import { type Job } from "../types"
import { JobToolSummary } from "./tools"

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
  expect(screen.getByText("Web access allowed")).toBeDefined()
})

test("collapses additional integrations into a tooltip count", async () => {
  const { container } = renderToolSummary([
    "github",
    "slack",
    "googleCalendar",
    "notion",
  ])

  expect(container.querySelectorAll("img")).toHaveLength(2)
  expect(screen.getByText("4 tools")).toBeDefined()

  const count = screen.getByRole("button", {
    name: "Show 2 more integrations: Google Calendar, Notion",
  })

  expect(count.textContent).toBe("+2")

  fireEvent.focus(count)

  expect(
    await screen.findAllByText("Google Calendar, Notion")
  ).not.toHaveLength(0)
})

test("says nothing about the web on a job that cannot reach it", () => {
  renderToolSummary(["slack"], false)

  // Blocked is the default every job starts at, so only the exception is
  // marked: one line, one statement, no alarm on a job behaving itself.
  expect(screen.getByText("1 tool")).toBeDefined()
  expect(screen.queryByText(/Web access/)).toBeNull()
})

function renderToolSummary(
  surfaces: JobSurfaceIntegration[],
  webSearch = true
) {
  return render(
    <TooltipProvider>
      <JobToolSummary job={jobWithSurfaces(surfaces, webSearch)} />
    </TooltipProvider>
  )
}

function jobWithSurfaces(
  surfaces: JobSurfaceIntegration[],
  webSearch: boolean
): Job {
  return {
    access: {
      webSearch,
      surfaces: surfaces.map((integration) => ({
        integration,
        tools: [`${integration}_tool`],
      })),
    },
  } as Job
}
