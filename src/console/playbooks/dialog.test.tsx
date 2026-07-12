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

  expectButtonDisabled("Enable")
  expectButtonDisabled(/try once/i)

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

  expect(screen.getByText(/sam@example.com/)).toBeDefined()
  expectButtonDisabled("Enable", false)
})

test("save stays disabled until the target actually changes", async () => {
  const actions = stubActions()

  renderDialog(actions, ["email", "slack"], singlePlan)
  fireEvent.click(screen.getByRole("button", { name: /change/i }))

  expectButtonDisabled("Save")

  await switchMode("Channel")
  expectButtonDisabled("Save")

  await switchMode("Email")
  expectButtonDisabled("Save")
})

test("try once shares the chosen destination", () => {
  const actions = stubActions()

  renderDialog(actions, ["email"], singlePlan)

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
    expectButtonDisabled(name)
  }
})

test("advanced settings closes this dialog only after creation", () => {
  const actions = stubActions()
  const onOpenChange = vi.fn()

  renderDialog(actions, ["email", "slack"], singlePlan, onOpenChange)
  fireEvent.click(screen.getByRole("button", { name: /advanced settings/i }))

  expect(onOpenChange).not.toHaveBeenCalled()

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

  fireEvent.click(screen.getByRole("combobox"))
  expect(screen.getByRole("listbox")).toBeDefined()
  await new Promise((resolve) => setTimeout(resolve, 0))

  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole("listbox")).toBeNull()
  fireEvent.click(document.body)
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(onOpenChange).not.toHaveBeenCalledWith(false)
  expect(screen.getByText(/set up meeting prep/i)).toBeDefined()
})

test("turning off both deliveries blocks enabling", async () => {
  shimSelectDom()

  renderDialog(stubActions(), ["email"], singlePlan, () => {}, meetingPrep())

  fireEvent.click(screen.getByRole("radio", { name: "Off" }))
  fireEvent.click(screen.getByRole("combobox"))
  await new Promise((resolve) => setTimeout(resolve, 0))
  fireEvent.click(screen.getByRole("option", { name: "Off" }))

  expect(
    screen.getByText("Turn on the morning digest or a pre-meeting send.")
  ).toBeDefined()
  for (const name of ["Enable", /try once/i, /advanced settings/i]) {
    expectButtonDisabled(name)
  }

  fireEvent.click(screen.getByRole("radio", { name: "On" }))

  expect(
    screen.queryByText("Turn on the morning digest or a pre-meeting send.")
  ).toBeNull()
  expectButtonDisabled("Enable", false)
})

test("a single organization domain is named in the meetings hint", () => {
  organizationProfile = { domains: ["acme.com"] }

  renderDialog(stubActions(), ["email"], singlePlan, () => {}, meetingPrep())
  fireEvent.click(screen.getByRole("radio", { name: "Internal" }))

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
  fireEvent.click(screen.getByRole("radio", { name: "Both" }))

  expect(screen.getByText(/Internal: 2 domains/)).toBeDefined()
  expect(screen.getByRole("link", { name: "Manage" })).toBeDefined()
})

test("the hint is hidden for the default External scope", () => {
  organizationProfile = { domains: ["acme.com"] }

  renderDialog(stubActions(), ["email"], singlePlan, () => {}, meetingPrep())

  expect(screen.queryByText(/Internal:/)).toBeNull()

  fireEvent.click(screen.getByRole("radio", { name: "Internal" }))

  expect(screen.getByText(/Internal: anyone at acme\.com/)).toBeDefined()

  fireEvent.click(screen.getByRole("radio", { name: "External" }))

  expect(screen.queryByText(/Internal:/)).toBeNull()
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

function expectButtonDisabled(name: string | RegExp, disabled = true) {
  expect(screen.getByRole("button", { name })).toHaveProperty(
    "disabled",
    disabled
  )
}

/** Radix Select touches pointer-capture and scroll APIs jsdom lacks. */
function shimSelectDom() {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
}

async function switchMode(mode: "Channel" | "DM" | "Email") {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Delivery method" }))

  if (mode === "Email") {
    fireEvent.click(screen.getByRole("menuitem", { name: "Email" }))
    return
  }

  const slack = screen.getByRole("menuitem", { name: "Slack" })

  slack.focus()
  fireEvent.keyDown(slack, { key: "ArrowRight" })
  fireEvent.click(await screen.findByRole("menuitem", { name: mode }))
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
