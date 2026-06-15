// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
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

function eventAutomation(): Automation {
  return {
    access: {
      surfaces: [],
    },
    lastRunAt: undefined,
    status: "active",
    trigger: {
      criteria: undefined,
      event: "issue.comment.created",
      filter: undefined,
      integration: "github",
      type: "event",
    },
  } as unknown as Automation
}
