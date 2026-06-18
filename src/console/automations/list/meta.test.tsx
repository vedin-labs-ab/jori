// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { absoluteTime } from "../format"
import { type Automation } from "../types"
import { AutomationMeta } from "./meta"

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

test("shows event integration with event name in help tooltip", async () => {
  const { container } = render(
    <TooltipProvider>
      <AutomationMeta now={1700000000000} automation={eventAutomation()} />
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
      <AutomationMeta now={1700000000000} automation={recurringAutomation()} />
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
      <AutomationMeta
        now={1700000000000}
        automation={oneTimeAutomation(runAt)}
      />
    </TooltipProvider>
  )

  fireEvent.focus(screen.getByRole("button", { name: detail }))

  await expectTooltipContent(detail)
})

function eventAutomation(): Automation {
  return {
    access: {
      surfaces: [],
    },
    firedAt: undefined,
    status: "active",
    type: "event",
    trigger: {
      criteria: undefined,
      event: "issue.comment.created",
      filter: undefined,
      integration: "github",
      type: "event",
    },
  } as unknown as Automation
}

function recurringAutomation(): Automation {
  return {
    access: {
      surfaces: [],
    },
    firedAt: undefined,
    status: "active",
    type: "cron",
    trigger: {
      cron: "0 9 * * *",
      nextAt: 1700038800000,
      type: "cron",
    },
  } as unknown as Automation
}

function oneTimeAutomation(runAt: number): Automation {
  return {
    access: {
      surfaces: [],
    },
    firedAt: undefined,
    status: "active",
    type: "once",
    trigger: {
      at: runAt,
      type: "once",
    },
  } as unknown as Automation
}

async function expectTooltipContent(text: string) {
  await waitFor(() => {
    expect(
      document.body.querySelector('[data-slot="tooltip-content"]')?.textContent
    ).toContain(text)
  })
}
