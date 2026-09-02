// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { absoluteTime } from "../../shared/time"
import { type Job } from "../types"
import { JobMeta } from "./meta"

afterEach(() => {
  cleanup()
})

test("shows event integration with event name in help tooltip", async () => {
  const { container } = render(
    <TooltipProvider>
      <JobMeta now={1700000000000} job={eventJob()} />
    </TooltipProvider>
  )

  expect(screen.getByText("Event")).toBeDefined()
  expect(screen.getByText("GitHub")).toBeDefined()
  expect(
    container.querySelectorAll('img[src="/logos/integrations/github.svg"]')
  ).toHaveLength(1)
  expect(screen.getByText("Monitoring")).toBeDefined()
  expect(screen.queryByText("Issue comment created")).toBeNull()

  fireEvent.focus(
    screen.getByRole("button", { name: "Event: Issue comment created" })
  )

  expect(await screen.findAllByText("Issue comment created")).not.toHaveLength(
    0
  )
})

test("shows recurring trigger detail in a tooltip", async () => {
  render(
    <TooltipProvider>
      <JobMeta now={1700000000000} job={recurringJob()} />
    </TooltipProvider>
  )

  const detail = "Daily at 09:00 UTC"

  fireEvent.focus(screen.getByRole("button", { name: detail }))

  await expectTooltipContent(detail)
})

test("shows one-time trigger timestamp in a tooltip", async () => {
  const runAt = 1700003600000
  const detail = absoluteTime(runAt)

  render(
    <TooltipProvider>
      <JobMeta now={1700000000000} job={oneTimeJob(runAt)} />
    </TooltipProvider>
  )

  fireEvent.focus(screen.getByRole("button", { name: detail }))

  await expectTooltipContent(detail)
})

function eventJob(): Job {
  return {
    access: {
      surfaces: [],
    },
    firedAt: undefined,
    status: "active",
    type: "event",
    trigger: {
      match: undefined,
      event: "issue.comment.created",
      integration: "github",
    },
  } as unknown as Job
}

function recurringJob(): Job {
  return {
    access: {
      surfaces: [],
    },
    firedAt: undefined,
    status: "active",
    type: "cron",
    trigger: {
      expression: "0 9 * * *",
      nextAt: 1700038800000,
    },
  } as unknown as Job
}

function oneTimeJob(runAt: number): Job {
  return {
    access: {
      surfaces: [],
    },
    firedAt: undefined,
    status: "active",
    type: "once",
    trigger: {
      at: runAt,
    },
  } as unknown as Job
}

async function expectTooltipContent(text: string) {
  await waitFor(() => {
    expect(
      document.body.querySelector('[data-slot="tooltip-content"]')?.textContent
    ).toContain(text)
  })
}
