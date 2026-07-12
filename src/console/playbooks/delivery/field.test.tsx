// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { DeliveryField } from "./field"

const convexMocks = vi.hoisted(() => ({
  search: vi.fn(async () => ({
    status: "ready" as const,
    options: [
      {
        value: "U123",
        label: "Sam Doe",
        description: "@sam - sam@example.com",
      },
    ],
  })),
}))

vi.mock("@clerk/tanstack-react-start", () => ({
  useUser: () => ({
    user: { primaryEmailAddress: { emailAddress: "sam@example.com" } },
  }),
}))

vi.mock("convex/react", () => ({
  useAction: () => convexMocks.search,
}))

beforeEach(() => {
  Object.assign(HTMLElement.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test("selects a Slack DM recipient and commits its stable user ID", async () => {
  const onChange = vi.fn()

  render(
    <DeliveryField
      availableKinds={["email", "slack"]}
      defaultKind="email"
      editing
      onChange={onChange}
      onEditingChange={vi.fn()}
      tenantId="tenant"
      value={{ kind: "email" }}
    />
  )

  await selectDeliveryMode("DM")

  const input = screen.getByRole("combobox", { name: "Slack person" })
  const group = input.closest('[role="group"]')

  if (!(group instanceof HTMLElement)) {
    throw new Error("Slack person field is missing its input group.")
  }

  fireEvent.click(within(group).getByRole("button"))
  const option = await screen.findByRole("option", { name: /Sam Doe/ })

  expect(convexMocks.search).toHaveBeenCalledWith(
    expect.objectContaining({ source: "slack.users" })
  )

  fireEvent.pointerDown(option, {
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
  })
  fireEvent.click(option)
  fireEvent.click(screen.getByRole("button", { name: "Save" }))

  expect(onChange).toHaveBeenCalledWith({
    kind: "slack",
    target: { kind: "dm", id: "U123", label: "Sam Doe" },
  })
})

async function selectDeliveryMode(mode: "Channel" | "DM") {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Delivery method" }))
  const slack = screen.getByRole("menuitem", { name: "Slack" })

  slack.focus()
  fireEvent.keyDown(slack, { key: "ArrowRight" })
  fireEvent.click(await screen.findByRole("menuitem", { name: mode }))
}
