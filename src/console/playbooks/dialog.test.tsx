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

let organizationProfile: Record<string, unknown> = {}

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useAction: () => vi.fn(async () => ({ status: "ready", options: [] })),
  useQuery: () => organizationProfile,
}))

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

afterEach(() => {
  cleanup()
  organizationProfile = {}
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
    { kind: "email" },
    {}
  )
})

test("an open edit blocks enabling until saved or cancelled", () => {
  const actions = stubActions()

  renderDialog(actions, ["email", "slack"], singlePlan)
  fireEvent.click(screen.getByRole("button", { name: /change/i }))

  expect(screen.getByRole("button", { name: "Enable" })).toHaveProperty(
    "disabled",
    true
  )
  expect(screen.getByRole("button", { name: /try once/i })).toHaveProperty(
    "disabled",
    true
  )

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

  expect(screen.getByText(/sam@example.com/)).toBeDefined()
  expect(screen.getByRole("button", { name: "Enable" })).toHaveProperty(
    "disabled",
    false
  )
})

test("save stays disabled until the target actually changes", () => {
  const actions = stubActions()

  renderDialog(actions, ["email", "slack"], singlePlan)
  fireEvent.click(screen.getByRole("button", { name: /change/i }))

  // Same target as committed: nothing to save yet.
  expect(screen.getByRole("button", { name: "Save" })).toHaveProperty(
    "disabled",
    true
  )

  switchKind("Slack")
  // Slack needs a channel before the draft is saveable.
  expect(screen.getByRole("button", { name: "Save" })).toHaveProperty(
    "disabled",
    true
  )

  switchKind("Email")
  // Back to the committed target: still nothing to save.
  expect(screen.getByRole("button", { name: "Save" })).toHaveProperty(
    "disabled",
    true
  )
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
    { kind: "email" },
    {}
  )
})

test("a pending Advanced settings locks every control", () => {
  const actions = stubActions({ key: morningBrief.key, kind: "advanced" })

  renderDialog(actions, ["email", "slack"], singlePlan)

  for (const name of [/change/i, /try once/i, "Enable", /advanced settings/i]) {
    expect(screen.getByRole("button", { name })).toHaveProperty(
      "disabled",
      true
    )
  }
})

test("advanced settings closes this dialog only after creation", () => {
  const actions = stubActions()
  const onOpenChange = vi.fn()

  renderDialog(actions, ["email", "slack"], singlePlan, onOpenChange)
  fireEvent.click(screen.getByRole("button", { name: /advanced settings/i }))

  // The builder stacks on top: nothing closes when it merely opens.
  expect(onOpenChange).not.toHaveBeenCalled()

  // Creating an automation from the draft fires the handed-over close.
  const onCreated = vi.mocked(actions.openAdvanced).mock.calls[0][4]
  onCreated()

  expect(onOpenChange).toHaveBeenCalledWith(false)
})

test("closing an option dropdown never closes the dialog", async () => {
  shimSelectDom()
  const onOpenChange = vi.fn()

  renderDialog(
    stubActions(),
    ["email"],
    singlePlan,
    onOpenChange,
    meetingPrep()
  )

  // The default digest mode shows the "Remind before" minutes select.
  fireEvent.click(screen.getByRole("combobox"))
  expect(screen.getByRole("listbox")).toBeDefined()
  // Dismissable layers attach their outside listeners a tick after opening.
  await new Promise((resolve) => setTimeout(resolve, 0))

  // Dismissing the dropdown by clicking elsewhere closes only the dropdown.
  // The dialog defers its own outside dismissal to the gesture's click, so
  // the full pointerdown-then-click sequence is what the regression needs.
  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole("listbox")).toBeNull()
  fireEvent.click(document.body)
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(onOpenChange).not.toHaveBeenCalledWith(false)
  expect(screen.getByText(/set up meeting prep/i)).toBeDefined()
})

test("a single organization domain is named in the meetings hint", () => {
  organizationProfile = { domains: ["acme.com"] }

  renderDialog(stubActions(), ["email"], singlePlan, () => {}, meetingPrep())

  expect(screen.getByText(/Internal: anyone at acme\.com/)).toBeDefined()
  expect(
    screen.getByRole("link", { name: "Manage" }).getAttribute("href")
  ).toBe("/context")
})

test("multiple organization domains collapse to a count", () => {
  organizationProfile = {
    domains: ["acme.com"],
    declared: { domains: ["acme.io"] },
  }

  renderDialog(stubActions(), ["email"], singlePlan, () => {}, meetingPrep())

  expect(screen.getByText(/Internal: 2 domains/)).toBeDefined()
  expect(screen.getByRole("link", { name: "Manage" })).toBeDefined()
})

test("selecting External hides the internal-domains hint", () => {
  organizationProfile = { domains: ["acme.com"] }

  renderDialog(stubActions(), ["email"], singlePlan, () => {}, meetingPrep())

  expect(screen.getByText(/Internal: anyone at acme\.com/)).toBeDefined()

  fireEvent.click(screen.getByRole("radio", { name: "External" }))

  expect(screen.queryByText(/Internal:/)).toBeNull()

  fireEvent.click(screen.getByRole("radio", { name: "Internal" }))

  expect(screen.getByText(/Internal: anyone at acme\.com/)).toBeDefined()
})

function meetingPrep() {
  const definition = playbookCatalog.find(
    (entry) => entry.key === "meeting-prep"
  )

  if (definition === undefined) {
    throw new Error("Meeting prep definition is missing.")
  }

  return definition
}

/** Radix Select touches pointer-capture and scroll APIs jsdom lacks. */
function shimSelectDom() {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
}

function switchKind(kind: string) {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Delivery kind" }))
  fireEvent.click(screen.getByRole("menuitem", { name: kind }))
}

function renderDialog(
  actions: PlaybookActions,
  delivery: PlaybookListRow["delivery"],
  plan: Exclude<PlaybookEnablePlan, { kind: "connect" }>,
  onOpenChange: (open: boolean) => void = () => {},
  definition = morningBrief
) {
  return render(
    <PlaybookSetupDialog
      actions={actions}
      definition={definition}
      onOpenChange={onOpenChange}
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

function stubActions(pending?: PlaybookActions["pending"]): PlaybookActions {
  return {
    pending,
    edit: vi.fn(async () => {}),
    enable: vi.fn(async () => {}),
    openAdvanced: vi.fn(async () => {}),
    preloadEdit: vi.fn(),
    trial: vi.fn(async () => {}),
    runNow: vi.fn(async () => {}),
    setPaused: vi.fn(async () => {}),
  }
}
