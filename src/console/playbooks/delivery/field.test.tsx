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
        value: "C123",
        label: "#general",
        description: "Public - 12 members",
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

const options = [
  { mode: "dm", available: true },
  { mode: "email", available: true },
  { mode: "channel", available: true },
] as const

test("selects self Slack DM without choosing another person", async () => {
  const onChange = vi.fn()

  render(
    <DeliveryField
      editing
      onChange={onChange}
      onEditingChange={vi.fn()}
      options={[...options]}
      tenantId="tenant"
      value={{ kind: "email" }}
    />
  )

  selectDeliveryMode("Slack DM")
  expect(screen.queryByRole("combobox")).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Save" }))

  expect(onChange).toHaveBeenCalledWith({
    kind: "slack",
    target: { kind: "dm" },
  })
})

test("selects a Slack channel and commits its stable channel ID", async () => {
  const onChange = vi.fn()

  render(
    <DeliveryField
      editing
      onChange={onChange}
      onEditingChange={vi.fn()}
      options={[...options]}
      tenantId="tenant"
      value={{ kind: "email" }}
    />
  )

  selectDeliveryMode("Slack channel")

  const input = screen.getByRole("combobox", { name: "Slack channel" })
  const group = input.closest('[role="group"]')

  if (!(group instanceof HTMLElement)) {
    throw new Error("Slack channel field is missing its input group.")
  }

  fireEvent.click(within(group).getByRole("button"))
  const option = await screen.findByRole("option", { name: /general/ })

  expect(convexMocks.search).toHaveBeenCalledWith(
    expect.objectContaining({ source: "slack.channels" })
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
    target: { kind: "channel", id: "C123", label: "general" },
  })
})

function selectDeliveryMode(mode: "Slack channel" | "Slack DM") {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Delivery method" }))
  const slack = screen.getByRole("menuitem", { name: "Slack" })
  slack.focus()
  fireEvent.keyDown(slack, { key: "ArrowRight" })
  fireEvent.click(
    screen.getByRole("menuitem", {
      name: mode === "Slack DM" ? "DM" : "Channel",
    })
  )
}
