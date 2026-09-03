// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ListControls } from "@/shared/console/list/controls"
import { type RowSelection } from "@/shared/console/list/selection"
import { type Job } from "../types"
import { JobList } from "."
import { jobListConfig } from "./config"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../../test/router")).Link,
}))

afterEach(cleanup)

// The rows tell their times against the clock, so the fixture hangs off it.
const now = Date.now()
const day = 86_400_000

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    ownerId: "person-1",
    ownerName: "Ada Lovelace",
    ownerImage: undefined,
    key: undefined,
    name: "Weekly digest",
    instructions: "Review GitHub and post to Slack.",
    audience: "organization",
    visibility: { mode: "organization" },
    type: "cron",
    status: "active",
    folderId: "folder-1",
    trigger: { expression: "0 9 * * *", timezone: "UTC", nextAt: now + day },
    access: {
      webSearch: true,
      surfaces: [{ integration: "slack", access: "write", tools: ["post"] }],
    },
    createdAt: now - 3 * day,
    updatedAt: now - day,
    firedAt: now - day,
    ...overrides,
  } as Job
}

function stubSelection<Row>(): RowSelection<Row> {
  return {
    allSelected: false,
    clear: () => undefined,
    count: 0,
    isSelected: () => false,
    selected: [],
    toggle: () => undefined,
    toggleAll: () => undefined,
  }
}

function stubControls(overrides: Partial<ListControls> = {}): ListControls {
  return {
    getFacet: () => undefined,
    hasActiveControls: false,
    isFacetActive: () => false,
    setFacet: () => undefined,
    sort: undefined,
    toggleSort: () => undefined,
    ...overrides,
  }
}

const folders = new Map([
  ["folder-1", { hasContents: true, name: "Renewals", parentId: undefined }],
])

function renderList(
  jobs: Job[],
  {
    controls = stubControls(),
    onDelete = vi.fn(),
    onPausedChange = vi.fn(),
  }: {
    controls?: ListControls
    onDelete?: (job: Job) => void
    onPausedChange?: (job: Job, paused: boolean) => void
  } = {}
) {
  render(
    <TooltipProvider>
      <JobList
        config={jobListConfig(folders, jobs)}
        controllingJobId={undefined}
        controls={controls}
        deletingJobId={undefined}
        folders={folders}
        hasFilters={false}
        jobs={jobs}
        onCreate={() => undefined}
        onDelete={onDelete}
        onEdit={() => undefined}
        onMoveToFolder={() => undefined}
        onPausedChange={onPausedChange}
        selection={stubSelection()}
        unauthorizedMessage={undefined}
      />
    </TooltipProvider>
  )
}

test("lists the trigger, tools, folder, owner, and run columns", () => {
  renderList([job()])

  for (const header of ["Name", "Last run", "Next run"]) {
    expect(screen.getByRole("button", { name: header })).toBeDefined()
  }
  for (const header of ["Trigger", "Tools"]) {
    expect(screen.getByRole("columnheader", { name: header })).toBeDefined()
  }

  const link = screen.getByRole("link", { name: "Weekly digest" })

  expect(link.getAttribute("href")).toBe("/jobs/job-1")
  expect(screen.getByText("Recurring")).toBeDefined()
  expect(screen.getByTitle("Daily at 09:00 UTC")).toBeDefined()
  expect(screen.getByText("1 tool")).toBeDefined()
  expect(screen.getByRole("link", { name: "Renewals" })).toBeDefined()
  expect(screen.getByText("Ada Lovelace")).toBeDefined()
  expect(screen.getByText("Yesterday")).toBeDefined()
  expect(screen.getByText("in 1d")).toBeDefined()
})

test("event and one-time triggers read as their source and their date", () => {
  renderList([
    job({
      id: "job-event" as Job["id"],
      name: "Triage",
      type: "event",
      trigger: {
        match: undefined,
        event: "issue.comment.created",
        integration: "github",
      },
    }),
    job({
      id: "job-once" as Job["id"],
      name: "Migration",
      type: "once",
      trigger: { at: now + 2 * day },
    }),
  ])

  expect(screen.getByText("Event")).toBeDefined()
  expect(screen.getByText("GitHub")).toBeDefined()
  expect(
    screen.getByRole("button", { name: "Event: Issue comment created" })
  ).toBeDefined()
  expect(screen.getByText("One-time")).toBeDefined()
  // An event job runs when something happens, so it has no next run.
  expect(screen.getAllByText("—")).toHaveLength(1)
})

test("a paused job wears a badge and has no next run", () => {
  renderList([job({ status: "paused" })])

  expect(screen.getByText("Paused")).toBeDefined()
  expect(screen.getByText("—")).toBeDefined()
})

test("header buttons drive the sort and expose the facet menus", () => {
  const toggleSort = vi.fn()
  renderList([job()], { controls: stubControls({ toggleSort }) })

  fireEvent.click(screen.getByRole("button", { name: "Name" }))
  fireEvent.click(screen.getByRole("button", { name: "Next run" }))

  expect(toggleSort.mock.calls).toEqual([["name"], ["next"]])
  expect(screen.getByRole("button", { name: "Folder" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Owner" })).toBeDefined()
})

test("a row offers the job's whole menu and confirms its delete", () => {
  const onDelete = vi.fn()
  const onPausedChange = vi.fn()
  renderList([job()], { onDelete, onPausedChange })

  openActions()

  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent)
  ).toEqual(["Edit", "Move to folder…", "Pause", "Delete"])

  fireEvent.click(screen.getByRole("menuitem", { name: "Pause" }))

  expect(onPausedChange).toHaveBeenCalledWith(
    expect.objectContaining({ id: "job-1" }),
    true
  )

  openActions()
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))

  expect(screen.getByText('Delete "Weekly digest"?')).toBeDefined()
  expect(onDelete).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Delete job" }))

  expect(onDelete).toHaveBeenCalledWith(
    expect.objectContaining({ id: "job-1" })
  )
})

function openActions() {
  fireEvent.pointerDown(
    screen.getByRole("button", { name: "Open actions for Weekly digest" }),
    { button: 0, ctrlKey: false }
  )
}
