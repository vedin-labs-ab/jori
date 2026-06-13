// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import {
  mockProviderConnections,
  providerConnections,
  renderEventFields,
} from "./event.test.helpers"
import { getProviderOptions } from "./provider/options"

describe("automation event fields", () => {
  test("disables the event picker when the selected provider has one event", () => {
    renderEventFields({ eventProvider: "slack", event: "message.created" })

    expect(screen.getByLabelText("Event").hasAttribute("disabled")).toBe(true)
  })

  test("renders the selected provider logo in the provider picker", () => {
    renderEventFields({ eventProvider: "slack", event: "message.created" })

    expect(
      screen
        .getByLabelText("Integration")
        .querySelector('img[src="/logos/providers/slack.svg"]')
    ).not.toBeNull()
  })
})

describe("automation event provider picker", () => {
  test("opens the provider picker menu", () => {
    renderEventFields({ eventProvider: "slack", event: "message.created" })

    openProviderPicker()

    expect(screen.getByRole("option", { name: /GitHub/ })).toBeDefined()
  })

  test("opens the provider picker when the selected provider is not connected", () => {
    mockProviderConnections("github")

    renderEventFields({ eventProvider: "slack", event: "message.created" })

    openProviderPicker()

    expect(screen.getByRole("option", { name: /GitHub/ })).toBeDefined()
    expect(
      screen
        .getByRole("option", { name: /Slack/ })
        .getAttribute("data-disabled")
    ).toBe("")
  })

  test("opens the provider picker when no providers are connected", () => {
    mockProviderConnections()

    renderEventFields({ eventProvider: "slack", event: "message.created" })

    openProviderPicker()

    expect(screen.getByRole("option", { name: /Slack/ })).toBeDefined()
    expect(screen.getAllByText("Not connected").length).toBeGreaterThan(0)
  })
})

describe("automation event provider options", () => {
  test("places connected providers first and marks unconnected providers", () => {
    const options = getProviderOptions(providerConnections("github"))

    expect(options[0]).toMatchObject({
      connected: true,
      provider: "github",
    })
    expect(options.slice(1).every((option) => option.connected === false)).toBe(
      true
    )
    expect(options[1].provider).toBe("slack")
  })
})

function openProviderPicker() {
  fireEvent.pointerDown(screen.getByLabelText("Integration"), {
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
  })
}
