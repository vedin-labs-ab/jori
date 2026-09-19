/* @vitest-environment jsdom */

import assert from "node:assert/strict"

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoConsoleAt } from "../../../../../test/demo"
import { folderId } from "../../fixtures/folders"
import { jobId } from "../../fixtures/jobs"

// Load real lazy views before interaction assertions start their deadlines.
import "./detail"
import "../folders"
import "@/shared/console/jobs/editor/dialog"
import "@/shared/console/jobs/editor/schedule/picker"

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
  expect(screen.getByText("Weekly")).toBeDefined()
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

test("the demo editor warns about a job that reads private data and the web", async () => {
  render(<DemoConsoleAt path={`/jobs/${jobId("competitor")}`} />)
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }))
  const editor = await screen.findByRole("dialog", { name: "Edit job" })
  expect(
    within(editor).getByText("This job could expose private data")
  ).toBeDefined()
  expect(
    within(editor)
      .getByRole("button", { name: "Save changes" })
      .hasAttribute("disabled")
  ).toBe(false)
})

test("a filed job keeps the same owner and status through its page and title menu", async () => {
  render(<DemoConsoleAt path={`/folders/${folderId("design")}`} />)
  const link = await screen.findByRole("link", { name: "Design review digest" })
  const row = link.closest("tr")
  assert(row)
  expect(within(row).getByText("Hanna Ek")).toBeDefined()
  expect(within(row).queryByText("Jori")).toBeNull()

  fireEvent.pointerDown(screen.getByRole("button", { name: "Design" }))
  const folderMenu = await screen.findByRole("menu")
  expect(within(folderMenu).getByText("Hanna Ek")).toBeDefined()
  expect(within(folderMenu).getByText(/^Updated /).textContent).not.toContain(
    " · "
  )
  expect(
    within(folderMenu)
      .getAllByRole("menuitem")
      .map((item) => item.textContent)
  ).toEqual(["Usage", "Rename", "Audience…", "Move to folder…", "Delete"])
  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })

  fireEvent.click(link)
  expect(await screen.findByText("Instructions")).toBeDefined()
  expect(screen.getByRole("button", { name: "Resume" })).toBeDefined()
  const title = screen.getByRole("button", { name: "Design review digest" })
  fireEvent.pointerDown(title)
  fireEvent.click(title)
  expect(
    within(await screen.findByRole("menu")).getByText("Hanna Ek")
  ).toBeDefined()
  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
  fireEvent.click(screen.getByRole("button", { name: "Resume" }))
  fireEvent.click(screen.getByRole("link", { name: "Design" }))
  const returned = (
    await screen.findByRole("link", { name: "Design review digest" })
  ).closest("tr")
  assert(returned)
  expect(within(returned).getByText("Hanna Ek")).toBeDefined()
  expect(within(returned).queryByText("Paused")).toBeNull()
})
