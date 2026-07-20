// @vitest-environment jsdom

import { playbookCatalog } from "@contracts/playbooks/catalog"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type PlaybookActions } from "../../enable"
import { stubPlaybookActions } from "../../fixtures"
import { type PlaybookEnablePlan, type PlaybookListRow } from "../../state"
import { PlaybookSetupDialog } from "../dialog"

const convexMocks = vi.hoisted(() => ({
  saveDeliveryPreference: vi.fn(async () => null),
}))

vi.mock("@/shared/session/auth", () => ({
  useSession: () => ({
    data: { user: { email: "sam@example.com" } },
    isPending: false,
  }),
}))

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useAction: () => vi.fn(async () => ({ status: "ready", options: [] })),
  useMutation: () => convexMocks.saveDeliveryPreference,
  useQuery: () => ({}),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const morningBrief = playbookCatalog[0]
const plan: Exclude<PlaybookEnablePlan, { kind: "connect" }> = {
  kind: "enable",
  choices: { email: "gmail", calendar: "googleCalendar" },
}

test("uses the server-recommended self Slack DM", () => {
  const actions = stubPlaybookActions()

  renderDialog(
    actions,
    deliverySetup({ kind: "slack", target: { kind: "dm" } })
  )
  fireEvent.click(screen.getByRole("button", { name: "Enable" }))

  expect(screen.getByText("Albin Vedin")).toBeDefined()
  expect(actions.enable).toHaveBeenCalledWith(
    morningBrief,
    { email: "gmail", calendar: "googleCalendar" },
    { kind: "slack", target: { kind: "dm" } },
    {}
  )
})

test("an open edit blocks enabling until cancelled", () => {
  renderDialog(stubPlaybookActions(), deliverySetup())
  fireEvent.click(screen.getByRole("button", { name: /change/i }))

  expectButtonDisabled("Enable")
  expectButtonDisabled(/try once/i)

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
  expectButtonDisabled("Enable", false)
})

test("save stays disabled until the target changes", () => {
  renderDialog(stubPlaybookActions(), deliverySetup())
  fireEvent.click(screen.getByRole("button", { name: /change/i }))

  expectButtonDisabled("Save")
  switchMode("Slack channel")
  expectButtonDisabled("Save")
  switchMode("Email")
  expectButtonDisabled("Save")
})

test("saves an explicit delivery change as the future preference", () => {
  renderDialog(stubPlaybookActions(), deliverySetup())
  fireEvent.click(screen.getByRole("button", { name: /change/i }))

  switchMode("Slack DM")
  fireEvent.click(screen.getByRole("button", { name: "Save" }))

  expect(convexMocks.saveDeliveryPreference).toHaveBeenCalledWith({
    organizationId: "organization",
    delivery: { kind: "slack", target: { kind: "dm" } },
  })
})

function renderDialog(
  actions: PlaybookActions,
  delivery: PlaybookListRow["delivery"]
) {
  return render(
    <PlaybookSetupDialog
      actions={actions}
      definition={morningBrief}
      onOpenChange={() => {}}
      open
      plan={plan}
      row={{
        key: morningBrief.key,
        slots: [
          { capability: "email", connected: ["gmail"] },
          { capability: "calendar", connected: ["googleCalendar"] },
        ],
        delivery,
        enabled: null,
      }}
      organizationId="organization"
    />
  )
}

function deliverySetup(
  recommended: NonNullable<PlaybookListRow["delivery"]["recommended"]> = {
    kind: "email",
  }
): PlaybookListRow["delivery"] {
  return {
    options: [
      { mode: "dm", available: true, label: "Albin Vedin" },
      { mode: "email", available: true },
      { mode: "channel", available: true },
    ],
    recommended,
  }
}

function switchMode(mode: "Slack channel" | "Slack DM" | "Email") {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Delivery method" }))
  if (mode === "Email") {
    fireEvent.click(screen.getByRole("menuitem", { name: mode }))
    return
  }

  const slack = screen.getByRole("menuitem", { name: "Slack" })
  slack.focus()
  fireEvent.keyDown(slack, { key: "ArrowRight" })
  fireEvent.click(
    screen.getByRole("menuitem", {
      name: mode === "Slack DM" ? "DM" : "Channel",
    })
  )
}

function expectButtonDisabled(name: string | RegExp, disabled = true) {
  expect(screen.getByRole("button", { name })).toHaveProperty(
    "disabled",
    disabled
  )
}
