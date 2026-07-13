// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DeliveryModeMenu } from "./menu"

afterEach(cleanup)

test("shows prioritized methods and explains unavailable choices", () => {
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
  const dm = screen.getByRole("menuitem", { name: /Slack DM/ })
  const email = screen.getByRole("menuitem", { name: "Email" })
  const channel = screen.getByRole("menuitem", { name: "Slack channel" })

  expect(channel.querySelector("svg")?.classList).toContain("lucide-hash")
  expect(dm.querySelector("svg")?.classList).toContain("lucide-message-circle")
  expect(email.querySelector("svg")?.classList).toContain("lucide-mail")
  expect(dm.getAttribute("data-disabled")).not.toBeNull()
  expect(screen.getByText("No Slack identity linked")).toBeDefined()

  fireEvent.click(channel)
  expect(onSelect).toHaveBeenCalledWith("channel")
})
