// @vitest-environment jsdom
import { playbookCatalog } from "@contracts/playbooks/catalog"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type PlaybookActions } from "../enable"
import { stubPlaybookActions } from "../fixtures"
import { type PlaybookEnablePlan, type PlaybookListRow } from "../state"
import { PlaybookSetupDialog } from "./dialog"

const convexMocks = vi.hoisted(() => ({
  saveDeliveryPreference: vi.fn(async () => null),
}))

vi.mock("@/shared/session/auth", () => ({
  useSession: () => ({
    data: { user: { email: "sam@example.com" } },
    isPending: false,
  }),
}))

let organizationProfile: Record<string, unknown> = {}

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useAction: () => vi.fn(async () => ({ status: "ready", options: [] })),
  useMutation: () => convexMocks.saveDeliveryPreference,
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
  vi.clearAllMocks()
})

const morningBrief = playbookCatalog[0]

const singlePlan: Exclude<PlaybookEnablePlan, { kind: "connect" }> = {
  kind: "enable",
  choices: { email: "gmail", calendar: "googleCalendar" },
}

test("a pending Advanced settings locks every control", () => {
  const actions = stubPlaybookActions({
    key: morningBrief.key,
    kind: "advanced",
  })

  renderDialog(actions, deliverySetup(), singlePlan)

  for (const name of [/change/i, /try once/i, "Enable", /advanced settings/i]) {
    expectButtonDisabled(name)
  }
})

test("advanced settings closes this dialog only after creation", () => {
  const actions = stubPlaybookActions()
  const onOpenChange = vi.fn()

  renderDialog(actions, deliverySetup(), singlePlan, onOpenChange)
  fireEvent.click(screen.getByRole("button", { name: /advanced settings/i }))

  expect(onOpenChange).not.toHaveBeenCalled()

  const onCreated = vi.mocked(actions.openAdvanced).mock.calls[0][4]
  onCreated()

  expect(onOpenChange).toHaveBeenCalledWith(false)
})

test("closing an option dropdown never closes the dialog", async () => {
  shimSelectDom()
  const onOpenChange = vi.fn()

  renderBriefing(onOpenChange)

  fireEvent.click(screen.getByText("Toggle before meetings"))
  fireEvent.click(screen.getByRole("combobox"))
  expect(screen.getByRole("listbox")).toBeDefined()
  await new Promise((resolve) => setTimeout(resolve, 0))

  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole("listbox")).toBeNull()
  fireEvent.click(document.body)
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(onOpenChange).not.toHaveBeenCalledWith(false)
  expect(screen.getByText(/set up meeting briefing/i)).toBeDefined()
})

test("turning off both deliveries blocks enabling", async () => {
  renderBriefing()

  fireEvent.click(
    screen.getByRole("checkbox", { name: "Include morning briefing" })
  )

  expect(screen.getByText("Choose at least one delivery time.")).toBeDefined()
  expect(
    screen
      .getByRole("group", { name: "Delivery timing" })
      .getAttribute("aria-invalid")
  ).toBe("true")
  for (const name of ["Enable", /try once/i, /advanced settings/i]) {
    expectButtonDisabled(name)
  }

  fireEvent.click(screen.getByText("Toggle before meetings"))

  expect(screen.queryByText("Choose at least one delivery time.")).toBeNull()
  expectButtonDisabled("Enable", false)
})

test("setup groups meeting scope and delivery behaviors", () => {
  renderBriefing()

  expect(screen.getByText("Meetings")).toBeDefined()
  expect(screen.getByRole("group", { name: "Delivery timing" })).toBeDefined()
  expect(screen.queryByText("Schedule")).toBeNull()
  expect(document.body.textContent).toMatch(/timing.*Deliver to.*Access/i)
  expect(
    screen
      .getByRole("checkbox", { name: "Include morning briefing" })
      .getAttribute("aria-checked")
  ).toBe("true")
  expect(
    screen
      .getByRole("checkbox", { name: "Include before meetings" })
      .getAttribute("aria-checked")
  ).toBe("false")
  expect(screen.getByLabelText("Send at")).toBeDefined()
  expect(screen.getByRole("combobox")).toHaveProperty("disabled", true)
})

test("behavior choices reach enable as normalized options", async () => {
  shimSelectDom()
  const actions = stubPlaybookActions()

  renderDialog(
    actions,
    deliverySetup(),
    singlePlan,
    () => {},
    meetingBriefing()
  )
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Include before meetings" })
  )
  fireEvent.click(screen.getByRole("combobox"))
  await new Promise((resolve) => setTimeout(resolve, 0))
  fireEvent.click(screen.getByRole("option", { name: "60 minutes before" }))
  fireEvent.click(screen.getByRole("button", { name: "Enable" }))

  expect(vi.mocked(actions.enable).mock.calls[0][3]).toEqual({
    meetings: "external",
    morning: true,
    morningTime: "07:30",
    beforeMeeting: true,
    leadMinutes: "60",
  })
})

test("a single organization domain is named in the meetings hint", () => {
  organizationProfile = { domains: ["acme.com"] }

  renderBriefing()
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

  renderBriefing()
  fireEvent.click(screen.getByRole("radio", { name: "Both" }))

  expect(screen.getByText(/Internal: 2 domains/)).toBeDefined()
  expect(screen.getByRole("link", { name: "Manage" })).toBeDefined()
})

test("the hint is hidden for the default External scope", () => {
  organizationProfile = { domains: ["acme.com"] }

  renderBriefing()

  expect(screen.queryByText(/Internal:/)).toBeNull()

  fireEvent.click(screen.getByRole("radio", { name: "Internal" }))

  expect(screen.getByText(/Internal: anyone at acme\.com/)).toBeDefined()

  fireEvent.click(screen.getByRole("radio", { name: "External" }))

  expect(screen.queryByText(/Internal:/)).toBeNull()
})

function meetingBriefing() {
  const definition = playbookCatalog.find(
    (entry) => entry.key === "meeting-briefing"
  )

  if (definition === undefined) {
    throw new Error("Meeting Briefing definition is missing.")
  }

  return definition
}

function renderBriefing(onOpenChange: (open: boolean) => void = () => {}) {
  return renderDialog(
    stubPlaybookActions(),
    deliverySetup({ kind: "email" }, [
      { mode: "dm", available: true },
      { mode: "email", available: true },
    ]),
    singlePlan,
    onOpenChange,
    meetingBriefing()
  )
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
      organizationId="organization"
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

function deliverySetup(
  recommended: NonNullable<PlaybookListRow["delivery"]["recommended"]> = {
    kind: "email",
  },
  options: PlaybookListRow["delivery"]["options"] = [
    { mode: "dm", available: true },
    { mode: "email", available: true },
    { mode: "channel", available: true },
  ]
): PlaybookListRow["delivery"] {
  return {
    options,
    recommended,
  }
}
