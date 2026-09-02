// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type Job } from "../types"
import { JobRow } from "./row"

afterEach(() => {
  cleanup()
})

test("deletes one-time job from status icon", () => {
  const onDelete = vi.fn()

  renderRow({
    onDelete,
    job: job({ type: "once", trigger: { at: now } }),
  })

  const control = screen.getByRole("button", { name: "Delete Weekly digest" })

  expect(screen.getByTestId("job-once-icon")).toBeDefined()
  expect(screen.queryByRole("button", { name: /pause/i })).toBeNull()
  expect(screen.queryByRole("button", { name: /resume/i })).toBeNull()

  fireEvent.pointerEnter(control)

  expect(screen.getByTestId("job-delete-icon")).toBeDefined()

  fireEvent.click(control)

  expect(screen.getByText('Delete "Weekly digest"?')).toBeDefined()
  expect(onDelete).not.toHaveBeenCalled()
})

test("uses the main icon instead of a badge for completed one-time job", () => {
  const { container } = renderRow({
    job: job({
      status: "completed",
      type: "once",
      trigger: { at: now },
    }),
  })

  expect(
    screen.getByRole("button", { name: "Delete Weekly digest" })
  ).toBeDefined()
  expect(screen.getByTestId("job-completed-icon")).toBeDefined()
  expect(container.querySelector('[data-slot="badge"]')).toBeNull()
  expect(screen.queryByRole("button", { name: /pause/i })).toBeNull()
  expect(screen.queryByRole("button", { name: /resume/i })).toBeNull()
})

test("pauses active recurring job from status icon", () => {
  const onPausedChange = vi.fn()

  renderRow({
    onPausedChange,
    job: job({
      type: "cron",
      trigger: { expression: "0 9 * * *", timezone: "UTC", nextAt: now + day },
    }),
  })

  fireEvent.click(screen.getByRole("button", { name: "Pause Weekly digest" }))

  expect(onPausedChange).toHaveBeenCalledWith(
    expect.objectContaining({ id: "job-id" }),
    true
  )
})

test("shows pause action while active cron icon is hovered", () => {
  renderRow({
    job: job({
      type: "cron",
      trigger: { expression: "0 9 * * *", timezone: "UTC", nextAt: now + day },
    }),
  })

  const control = screen.getByRole("button", { name: "Pause Weekly digest" })

  expect(screen.getByTestId("job-cron-icon")).toBeDefined()

  fireEvent.pointerEnter(control)

  expect(screen.getByTestId("job-pause-icon")).toBeDefined()
  expect(screen.queryByTestId("job-cron-icon")).toBeNull()

  fireEvent.pointerLeave(control)

  expect(screen.getByTestId("job-cron-icon")).toBeDefined()
})

test("resumes paused event job from status icon", () => {
  const onPausedChange = vi.fn()

  renderRow({
    onPausedChange,
    job: job({
      status: "paused",
      type: "event",
      trigger: {
        match: undefined,
        event: "issue.comment.created",
        integration: "github",
      },
    }),
  })

  fireEvent.click(screen.getByRole("button", { name: "Resume Weekly digest" }))

  expect(onPausedChange).toHaveBeenCalledWith(
    expect.objectContaining({ id: "job-id" }),
    false
  )
})

test("the action menu offers the job's whole menu", () => {
  renderRow({
    job: job({
      type: "cron",
      trigger: { expression: "0 9 * * *", timezone: "UTC", nextAt: now + day },
    }),
  })

  openActions()

  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent)
  ).toEqual(["Edit", "Move to folder…", "Pause", "Delete"])
})

test("opens the shared delete dialog from the action menu", () => {
  renderRow({
    job: job({
      type: "cron",
      trigger: { expression: "0 9 * * *", timezone: "UTC", nextAt: now + day },
    }),
  })

  openActions()
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))

  expect(screen.getAllByText('Delete "Weekly digest"?')).toHaveLength(1)
})

test("shows resume action while paused event icon is focused", () => {
  renderRow({
    job: job({
      status: "paused",
      type: "event",
      trigger: {
        match: undefined,
        event: "issue.comment.created",
        integration: "github",
      },
    }),
  })

  const control = screen.getByRole("button", { name: "Resume Weekly digest" })

  expect(screen.getByTestId("job-event-icon")).toBeDefined()

  fireEvent.focus(control)

  expect(screen.getByTestId("job-resume-icon")).toBeDefined()
  expect(screen.queryByTestId("job-event-icon")).toBeNull()

  fireEvent.blur(control)

  expect(screen.getByTestId("job-event-icon")).toBeDefined()
})

const now = 1_700_000_000_000
const day = 86_400_000

function renderRow({
  isControlling = false,
  onDelete = vi.fn(),
  onEdit = vi.fn(),
  onPausedChange = vi.fn(),
  job,
}: {
  isControlling?: boolean
  onDelete?: (job: Job) => void
  onEdit?: (job: Job) => void
  onPausedChange?: (job: Job, paused: boolean) => void
  job: Job
}) {
  return render(
    <TooltipProvider>
      <JobRow
        isControlling={isControlling}
        isDeleting={false}
        now={now}
        onDelete={onDelete}
        onEdit={onEdit}
        onMoveToFolder={vi.fn()}
        onPausedChange={onPausedChange}
        job={job}
      />
    </TooltipProvider>
  )
}

function openActions() {
  fireEvent.pointerDown(screen.getByRole("button", { name: /open actions/i }), {
    button: 0,
    ctrlKey: false,
  })
}

function job(overrides: Partial<Job> & Pick<Job, "trigger" | "type">): Job {
  return {
    id: "job-id",
    name: "Weekly digest",
    instructions: "Review GitHub and post to Slack.",
    access: {
      surfaces: [],
      webSearch: true,
    },
    visibility: { mode: "organization" },
    createdAt: now,
    updatedAt: now,
    firedAt: undefined,
    status: "active",
    ...overrides,
  } as Job
}
