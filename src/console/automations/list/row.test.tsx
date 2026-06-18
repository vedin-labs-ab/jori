// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type Automation } from "../types"
import { AutomationRow } from "./row"

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

test("keeps one-time automation status icon passive", () => {
  renderRow({ automation: automation({ type: "once", trigger: { at: now } }) })

  expect(screen.getByLabelText("One-time automation")).toBeDefined()
  expect(screen.queryByRole("button", { name: /pause/i })).toBeNull()
  expect(screen.queryByRole("button", { name: /resume/i })).toBeNull()
})

test("uses the main icon instead of a badge for completed one-time automation", () => {
  const { container } = renderRow({
    automation: automation({
      status: "completed",
      type: "once",
      trigger: { at: now },
    }),
  })

  expect(screen.getByLabelText("Completed automation")).toBeDefined()
  expect(screen.getByTestId("automation-completed-icon")).toBeDefined()
  expect(container.querySelector('[data-slot="badge"]')).toBeNull()
  expect(screen.queryByRole("button", { name: /pause/i })).toBeNull()
  expect(screen.queryByRole("button", { name: /resume/i })).toBeNull()
})

test("pauses active recurring automation from status icon", () => {
  const onPause = vi.fn()

  renderRow({
    onPause,
    automation: automation({
      type: "cron",
      trigger: { expression: "0 9 * * *", nextAt: now + day },
    }),
  })

  fireEvent.click(screen.getByRole("button", { name: "Pause Automation" }))

  expect(onPause).toHaveBeenCalledTimes(1)
})

test("shows pause action while active recurring icon is hovered", () => {
  renderRow({
    automation: automation({
      type: "cron",
      trigger: { expression: "0 9 * * *", nextAt: now + day },
    }),
  })

  const control = screen.getByRole("button", { name: "Pause Automation" })

  expect(screen.getByTestId("automation-active-icon")).toBeDefined()

  fireEvent.pointerEnter(control)

  expect(screen.getByTestId("automation-pause-icon")).toBeDefined()
  expect(screen.queryByTestId("automation-active-icon")).toBeNull()

  fireEvent.pointerLeave(control)

  expect(screen.getByTestId("automation-active-icon")).toBeDefined()
})

test("resumes paused event automation from status icon", () => {
  const onResume = vi.fn()

  renderRow({
    onResume,
    automation: automation({
      status: "paused",
      type: "event",
      trigger: {
        criteria: undefined,
        event: "issue.comment.created",
        filter: undefined,
        integration: "github",
      },
    }),
  })

  fireEvent.click(screen.getByRole("button", { name: "Resume Automation" }))

  expect(onResume).toHaveBeenCalledTimes(1)
})

test("shows resume action while paused event icon is focused", () => {
  renderRow({
    automation: automation({
      status: "paused",
      type: "event",
      trigger: {
        criteria: undefined,
        event: "issue.comment.created",
        filter: undefined,
        integration: "github",
      },
    }),
  })

  const control = screen.getByRole("button", { name: "Resume Automation" })

  expect(screen.getByTestId("automation-paused-icon")).toBeDefined()

  fireEvent.focus(control)

  expect(screen.getByTestId("automation-resume-icon")).toBeDefined()
  expect(screen.queryByTestId("automation-paused-icon")).toBeNull()

  fireEvent.blur(control)

  expect(screen.getByTestId("automation-paused-icon")).toBeDefined()
})

const now = 1_700_000_000_000
const day = 86_400_000

function renderRow({
  isControlling = false,
  onDelete = vi.fn(),
  onEdit = vi.fn(),
  onPause = vi.fn(),
  onResume = vi.fn(),
  automation,
}: {
  isControlling?: boolean
  onDelete?: (automation: Automation) => void
  onEdit?: (automation: Automation) => void
  onPause?: (automation: Automation) => void
  onResume?: (automation: Automation) => void
  automation: Automation
}) {
  return render(
    <TooltipProvider>
      <AutomationRow
        isControlling={isControlling}
        isDeleting={false}
        now={now}
        onDelete={onDelete}
        onEdit={onEdit}
        onPause={onPause}
        onResume={onResume}
        automation={automation}
      />
    </TooltipProvider>
  )
}

function automation(
  overrides: Partial<Automation> & Pick<Automation, "trigger" | "type">
): Automation {
  return {
    id: "automation-id",
    name: "Automation",
    instructions: "Review GitHub and post to Slack.",
    access: {
      surfaces: [],
      webSearch: true,
    },
    createdAt: now,
    updatedAt: now,
    firedAt: undefined,
    status: "active",
    ...overrides,
  } as Automation
}
