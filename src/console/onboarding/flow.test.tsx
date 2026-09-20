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

test("skipping the website leaves onboarding without a destination", () => {
  const { onDiscover, onFinish } = renderFlow({ timezone: "Europe/Stockholm" })

  fireEvent.click(screen.getByRole("button", { name: "I'll do this later" }))

  expect(onFinish).toHaveBeenCalledWith()
  expect(onDiscover).not.toHaveBeenCalled()
})

test("a discovery already under way reopens on the last step", () => {
  const { onFinish } = renderFlow({ discovery: running })

  expect(screen.getByText("Exploring your website")).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Continue to Jori" }))

  expect(onFinish).toHaveBeenCalledWith()
})
