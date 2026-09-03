/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoConsoleAt } from "../../../../../test/demo"
import { jobId } from "../../fixtures/jobs"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

afterEach(cleanup)

test("opens a job's page: its crumb, brief, trigger, and runs", async () => {
  const { container } = render(
    <DemoConsoleAt path={`/jobs/${jobId("chase")}`} />
  )

  expect(await screen.findByText("Instructions")).toBeDefined()
  // The crumb and the Folder row both lead to the folder it is filed in.
  expect(screen.getByRole("link", { name: "Jobs" })).toBeDefined()
  expect(screen.getAllByRole("link", { name: "Renewals" })).toHaveLength(1)
  expect(screen.getByText("Recurring")).toBeDefined()
  // The trigger's schedule, and the run's own note of it under Runs.
  expect(screen.getAllByText(/Mondays at 08:00/)).toHaveLength(2)
  expect(container.querySelector('[data-job-surface="slack"]')).not.toBeNull()
  expect(
    container.querySelector('[data-job-reference="skill"]')?.textContent
  ).toBe("reminders")
  // The run it left behind, under Runs, opening in place to its detail.
  expect(screen.getByRole("heading", { name: "Runs" })).toBeDefined()

  const row = container.querySelector("article button")

  expect(row).not.toBeNull()
  fireEvent.click(row as HTMLElement)

  expect(
    await screen.findByText("Three reminders sent", { exact: false })
  ).toBeDefined()
  expect(screen.getAllByText("Chase overdue invoices").length).toBeGreaterThan(
    1
  )
})

test("pauses and resumes from the header, and the editor opens from Edit", async () => {
  render(<DemoConsoleAt path={`/jobs/${jobId("chase")}`} />)

  fireEvent.click(await screen.findByRole("button", { name: "Pause" }))

  expect(await screen.findByRole("button", { name: "Resume" })).toBeDefined()
  expect(screen.getByText("Paused")).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Edit" }))

  expect(await screen.findByRole("dialog", { name: "Edit job" })).toBeDefined()
})

test("a job that is gone reads as not found", async () => {
  render(<DemoConsoleAt path="/jobs/jobs_missing" />)

  expect(await screen.findByText("Job not found")).toBeDefined()
})
