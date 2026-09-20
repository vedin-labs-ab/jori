// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type OrganizationDiscovery } from "../context/organization/types"
import { OnboardingFlow } from "./flow"

afterEach(cleanup)

vi.mock("@/shared/console/time", async (original) => ({
  ...(await original<typeof import("@/shared/console/time")>()),
  localTimezone: () => "Europe/Stockholm",
}))

const running = {
  _creationTime: 0,
  _id: "discovery",
  errors: [],
  organizationId: "organization",
  startedAt: 0,
  status: "running",
  steps: [],
} as unknown as OrganizationDiscovery

function renderFlow(props: Partial<Parameters<typeof OnboardingFlow>[0]> = {}) {
  const callbacks = {
    onApprove: vi.fn(async () => undefined),
    onCreate: vi.fn(async () => undefined),
    onDeclareTimezone: vi.fn(async () => undefined),
    onDiscover: vi.fn(async () => undefined),
    onFinish: vi.fn(),
  }

  render(
    <OnboardingFlow
      discovery={null}
      logo={<div>Logo</div>}
      name="Albin"
      organization="Copperline"
      proposal={undefined}
      timezone={undefined}
      {...callbacks}
      {...props}
    />
  )

  return callbacks
}

test("a person's first organization is named under their welcome", async () => {
  const { onCreate } = renderFlow({ organization: undefined })

  expect(screen.getByText("Welcome to Jori, Albin.")).toBeDefined()
  expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Continue" }))

  expect(screen.getByText("Name your organization.")).toBeDefined()
  expect(onCreate).not.toHaveBeenCalled()

  fireEvent.change(screen.getByLabelText("Organization name"), {
    target: { value: " Copperline " },
  })
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))

  await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Copperline"))
})

test("a later organization can be backed out of, and a refusal keeps the form", async () => {
  const onCancel = vi.fn()
  const onCreate = vi.fn(async () => {
    throw new Error("You can't create organizations yet.")
  })

  renderFlow({ onCancel, onCreate, organization: undefined })

  expect(screen.getByText("New organization")).toBeDefined()

  fireEvent.change(screen.getByLabelText("Organization name"), {
    target: { value: "Copperline" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))

  expect(
    await screen.findByText("You can't create organizations yet.")
  ).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

  expect(onCancel).toHaveBeenCalled()
})

test("walks from the details to Jori reading the website", async () => {
  const { onDeclareTimezone, onDiscover } = renderFlow()

  fireEvent.click(screen.getByRole("button", { name: "Continue" }))

  // The zone offered is the browser's, so continuing is enough.
  await waitFor(() =>
    expect(onDeclareTimezone).toHaveBeenCalledWith("Europe/Stockholm")
  )

  fireEvent.change(await screen.findByLabelText("Website"), {
    target: { value: " copperline.example " },
  })
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))

  expect(await screen.findByText("Exploring your website")).toBeDefined()
  expect(onDiscover).toHaveBeenCalledWith("copperline.example")
})

const ready = {
  ...(running as object),
  endedAt: 25_000,
  status: "completed",
  steps: [
    {
      completedAt: 25_000,
      id: "summary",
      kind: "summary",
      label: "Drafting profile",
      startedAt: 12_000,
    },
  ],
} as unknown as OrganizationDiscovery

const proposal = {
  aliases: [],
  domains: ["copperline.example"],
  generatedAt: 0,
  name: "Copperline Roofing",
  sources: [{ primary: true, url: "https://copperline.example/" }],
  summary: "Roofs and gutters.",
  website: "https://copperline.example/",
}

test("skipping the website ends on a chat or the tools, with nothing to review", () => {
  const { onDiscover, onFinish } = renderFlow({ timezone: "Europe/Stockholm" })

  fireEvent.click(screen.getByRole("button", { name: "I'll do this later" }))

  expect(screen.getByText("Copperline is ready.")).toBeDefined()
  expect(onFinish).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Connect your tools" }))
  expect(onFinish).toHaveBeenLastCalledWith("/integrations")

  fireEvent.click(screen.getByRole("button", { name: "Start a chat" }))
  expect(onFinish).toHaveBeenLastCalledWith()
  expect(onDiscover).not.toHaveBeenCalled()
})

test("what Jori drafted is corrected and kept inside the flow", async () => {
  const { onApprove } = renderFlow({ discovery: ready, proposal })

  fireEvent.click(screen.getByRole("button", { name: "Review profile" }))

  // The draft arrives as plain fields, said to come from the site.
  expect(screen.getByText("Does this sound like Copperline?")).toBeDefined()
  expect(screen.getByText(/1 page on copperline[.]example/)).toBeDefined()
  fireEvent.change(screen.getByLabelText("What you do"), {
    target: { value: "Roofs, gutters, and a ten-year guarantee." },
  })
  fireEvent.click(screen.getByRole("button", { name: "Looks right" }))

  await waitFor(() =>
    expect(onApprove).toHaveBeenCalledExactlyOnceWith({
      name: "Copperline Roofing",
      summary: "Roofs, gutters, and a ten-year guarantee.",
    })
  )
  expect(await screen.findByText("Copperline is ready.")).toBeDefined()
})

test("a draft can be left for later without keeping or discarding it", () => {
  const { onApprove } = renderFlow({ discovery: ready, proposal })

  fireEvent.click(screen.getByRole("button", { name: "Review profile" }))
  fireEvent.click(screen.getByRole("button", { name: "Skip for now" }))

  expect(screen.getByText("Copperline is ready.")).toBeDefined()
  expect(onApprove).not.toHaveBeenCalled()
})

test("a discovery under way reopens on its step, with no way past it until it ends", () => {
  renderFlow({ discovery: running })

  expect(screen.getByText("Exploring your website")).toBeDefined()
  // Skipping is for before the site is read. Once Jori has started, the
  // step waits for what it started.
  expect(
    (screen.getByRole("button", { name: /Extracting/ }) as HTMLButtonElement)
      .disabled
  ).toBe(true)
  expect(screen.queryByRole("button", { name: "Continue" })).toBeNull()
})
