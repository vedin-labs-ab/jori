// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DeliveryModeMenu } from "./menu"

afterEach(cleanup)

test("keeps Slack methods nested and explains unavailable choices", () => {
  const onSelect = vi.fn()

  render(
    <DeliveryModeMenu
      disabled={false}
      mode="email"
      onSelect={onSelect}
      options={[
        {
          mode: "dm",
          available: false,
          reason: "No Slack identity linked",
        },
        { mode: "email", available: true },
        { mode: "channel", available: true },
      ]}
    />
  )

  fireEvent.pointerDown(screen.getByRole("button", { name: "Delivery method" }))
  const email = screen.getByRole("menuitem", { name: "Email" })
  const slack = screen.getByRole("menuitem", { name: "Slack" })

  expect(screen.queryByRole("menuitem", { name: /^DM/ })).toBeNull()
  slack.focus()
  fireEvent.keyDown(slack, { key: "ArrowRight" })

  const dm = screen.getByRole("menuitem", { name: /^DM/ })
  const channel = screen.getByRole("menuitem", { name: "Channel" })

  expect(channel.querySelector("svg")?.classList).toContain("lucide-hash")
  expect(dm.querySelector("svg")?.classList).toContain("lucide-message-circle")
  expect(email.querySelector("svg")?.classList).toContain("lucide-mail")
  expect(dm.getAttribute("data-disabled")).not.toBeNull()
  expect(screen.getByText("No Slack identity linked")).toBeDefined()

  fireEvent.click(channel)
  expect(onSelect).toHaveBeenCalledWith("channel")
})

test("a playbook can offer Slack DM without exposing channels", () => {
  const onSelect = vi.fn()

  render(
    <DeliveryModeMenu
      disabled={false}
      mode="email"
      onSelect={onSelect}
      options={[
        { mode: "dm", available: true },
        { mode: "email", available: true },
      ]}
    />
  )

  fireEvent.pointerDown(screen.getByRole("button", { name: "Delivery method" }))
  const slack = screen.getByRole("menuitem", { name: "Slack" })
  slack.focus()
  fireEvent.keyDown(slack, { key: "ArrowRight" })
  expect(screen.queryByRole("menuitem", { name: "Channel" })).toBeNull()
  fireEvent.click(screen.getByRole("menuitem", { name: "DM" }))
  expect(onSelect).toHaveBeenCalledWith("dm")
})
