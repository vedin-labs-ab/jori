// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type OrganizationDiscovery } from "../context/organization/types"
import { OnboardingFlow } from "./flow"

afterEach(cleanup)

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
  const onDiscover = vi.fn(async () => undefined)
  const onFinish = vi.fn()

  render(
    <OnboardingFlow
      discovery={null}
      name="Albin"
      onDiscover={onDiscover}
      onFinish={onFinish}
      organization="Copperline"
      {...props}
    />
  )

  return { onDiscover, onFinish }
}

test("walks from the welcome to Jori reading the website", async () => {
  const { onDiscover } = renderFlow()

  fireEvent.click(screen.getByRole("button", { name: "Get started" }))
  fireEvent.change(screen.getByLabelText("Website"), {
    target: { value: " copperline.example " },
  })
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))

  expect(await screen.findByText("Exploring your website")).toBeDefined()
  expect(onDiscover).toHaveBeenCalledWith("copperline.example")
})

test("skipping the website leaves onboarding without a destination", () => {
  const { onDiscover, onFinish } = renderFlow()

  fireEvent.click(screen.getByRole("button", { name: "Get started" }))
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
