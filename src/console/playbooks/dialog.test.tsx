// @vitest-environment jsdom
import { playbookCatalog } from "@contracts/playbooks/catalog"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { PlaybookSetupDialog } from "./dialog"
import { type PlaybookActions } from "./enable"
import { type PlaybookEnablePlan, type PlaybookListRow } from "./state"

vi.mock("@clerk/tanstack-react-start", () => ({
  useUser: () => ({
    user: { primaryEmailAddress: { emailAddress: "sam@example.com" } },
  }),
}))

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useAction: () => vi.fn(async () => ({ status: "ready", options: [] })),
}))

afterEach(() => {
  cleanup()
})

const morningBrief = playbookCatalog[0]

const singlePlan: Exclude<PlaybookEnablePlan, { kind: "connect" }> = {
  kind: "enable",
  choices: { email: "gmail", calendar: "googleCalendar" },
}

test("defaults to email delivery and enables with that destination", () => {
  const actions = stubActions()

  renderDialog(actions, ["email", "slack"], singlePlan)

  expect(screen.getByText(/sam@example.com/)).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Enable" }))

  expect(actions.enable).toHaveBeenCalledWith(
    morningBrief,
    { email: "gmail", calendar: "googleCalendar" },
    { kind: "email" }
  )
})

test("an unsaved Slack edit can't save, yet enabling still uses email", () => {
  const actions = stubActions()

  renderDialog(actions, ["email", "slack"], singlePlan)
  startEditing("Slack")

  expect(screen.getByRole("button", { name: "Save" })).toHaveProperty(
    "disabled",
    true
  )

  fireEvent.click(screen.getByRole("button", { name: "Enable" }))

  expect(actions.enable).toHaveBeenCalledWith(
    morningBrief,
    { email: "gmail", calendar: "googleCalendar" },
    { kind: "email" }
  )
})

test("cancelling an edit returns to the committed destination", () => {
  const actions = stubActions()

  renderDialog(actions, ["email", "slack"], singlePlan)
  startEditing("Slack")
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

  expect(screen.getByText(/sam@example.com/)).toBeDefined()
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
})

test("try once shares the chosen destination", () => {
  const actions = stubActions()

  renderDialog(actions, ["email"], singlePlan)

  // A single delivery kind leaves nothing to change.
  expect(screen.queryByRole("button", { name: /change/i })).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: /try once/i }))

  expect(actions.trial).toHaveBeenCalledWith(
    morningBrief,
    { email: "gmail", calendar: "googleCalendar" },
    { kind: "email" }
  )
})

function startEditing(kind: string) {
  fireEvent.pointerDown(screen.getByRole("button", { name: /change/i }))
  fireEvent.click(screen.getByRole("menuitem", { name: kind }))
}

function renderDialog(
  actions: PlaybookActions,
  delivery: PlaybookListRow["delivery"],
  plan: Exclude<PlaybookEnablePlan, { kind: "connect" }>
) {
  return render(
    <PlaybookSetupDialog
      actions={actions}
      definition={morningBrief}
      onOpenChange={() => {}}
      open
      plan={plan}
      row={row(delivery)}
      tenantId="tenant"
    />
  )
}

function row(delivery: PlaybookListRow["delivery"]): PlaybookListRow {
  return {
    key: morningBrief.key,
    slots: [
      { capability: "email", connected: ["gmail"] },
      { capability: "calendar", connected: ["googleCalendar"] },
    ],
    delivery,
    enabled: null,
  }
}

function stubActions(): PlaybookActions {
  return {
    pending: undefined,
    edit: vi.fn(async () => {}),
    enable: vi.fn(async () => {}),
    openAdvanced: vi.fn(async () => {}),
    preloadEdit: vi.fn(),
    trial: vi.fn(async () => {}),
    runNow: vi.fn(async () => {}),
    setPaused: vi.fn(async () => {}),
  }
}
