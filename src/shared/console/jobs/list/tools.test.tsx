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

test("marks the web only on a job whose Jori grant reaches it", () => {
  renderToolSummary(["slack"], ["read_table"])

  // Off is where every job starts, so only the exception is marked: one
  // line, one statement, no alarm on a job behaving itself.
  expect(screen.getByText("2 tools")).toBeDefined()
  expect(screen.queryByText(/Web access/)).toBeNull()

  cleanup()
  renderToolSummary(["slack"], ["read_table", "web_search"])

  expect(screen.getByText("3 tools")).toBeDefined()
  expect(screen.getByText("Web access allowed")).toBeDefined()
})

function renderToolSummary(
  surfaces: Exclude<JobSurfaceIntegration, "jori">[],
  joriTools: string[] = []
) {
  return render(
    <TooltipProvider>
      <JobToolSummary job={jobWithSurfaces(surfaces, joriTools)} />
    </TooltipProvider>
  )
}

function jobWithSurfaces(
  surfaces: Exclude<JobSurfaceIntegration, "jori">[],
  joriTools: string[]
): Job {
  return {
    access: {
      surfaces: [
        ...surfaces.map((integration) => ({
          integration,
          tools: [`${integration}_tool`],
        })),
        ...(joriTools.length === 0
          ? []
          : [{ integration: "jori" as const, tools: joriTools }]),
      ],
    },
  } as Job
}
