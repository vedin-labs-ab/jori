// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DeliveryModeMenu } from "./menu"

afterEach(cleanup)

test("nests channel and DM under Slack with their target icons", async () => {
  const onSelect = vi.fn()

  render(
    <DeliveryModeMenu
      disabled={false}
      kinds={["email", "slack"]}
      mode="email"
      onSelect={onSelect}
    />
  )

  fireEvent.pointerDown(screen.getByRole("button", { name: "Delivery method" }))
  const slack = screen.getByRole("menuitem", { name: "Slack" })

  slack.focus()
  fireEvent.keyDown(slack, { key: "ArrowRight" })

  const channel = await screen.findByRole("menuitem", { name: "Channel" })
  const dm = screen.getByRole("menuitem", { name: "DM" })

  expect(channel.querySelector("svg")?.classList).toContain("lucide-hash")
  expect(dm.querySelector("svg")?.classList).toContain("lucide-message-circle")

  fireEvent.click(dm)
  expect(onSelect).toHaveBeenCalledWith("dm")
})
