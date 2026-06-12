// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { EventFields } from "./event"
import { getProviderOptions } from "./provider-options"
import { emptyAutomationForm } from "./types"

const convexMocks = vi.hoisted(() => ({
  useAction: vi.fn(() => vi.fn()),
  useQuery: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useAction: convexMocks.useAction,
  useQuery: convexMocks.useQuery,
}))

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  convexMocks.useQuery.mockReturnValue({
    providers: [
      { provider: "slack", connected: true },
      { provider: "linear", connected: true },
      { provider: "github", connected: true },
      { provider: "gmail", connected: true },
      { provider: "googleCalendar", connected: true },
      { provider: "googleDrive", connected: true },
      { provider: "notion", connected: true },
      { provider: "microsoftEmail", connected: true },
      { provider: "microsoftCalendar", connected: true },
    ],
  })
})

describe("automation event fields", () => {
  test("disables the event picker when the selected provider has one event", () => {
    render(
      <EventFields
        tenantId="tenant"
        onValuesChange={() => undefined}
        values={{
          ...emptyAutomationForm,
          type: "event",
          eventProvider: "slack",
          event: "message.created",
        }}
      />
    )

    expect(screen.getByLabelText("Event").hasAttribute("disabled")).toBe(true)
  })

  test("renders the selected provider logo in the provider picker", () => {
    render(
      <EventFields
        tenantId="tenant"
        onValuesChange={() => undefined}
        values={{
          ...emptyAutomationForm,
          type: "event",
          eventProvider: "slack",
          event: "message.created",
        }}
      />
    )

    expect(
      screen
        .getByLabelText("Provider")
        .querySelector('img[src="/logos/providers/slack.svg"]')
    ).not.toBeNull()
  })
})

describe("automation event provider options", () => {
  test("places connected providers first and marks unconnected providers", () => {
    const options = getProviderOptions({
      providers: [
        { provider: "slack", connected: false },
        { provider: "linear", connected: false },
        { provider: "github", connected: true },
        { provider: "gmail", connected: false },
        { provider: "googleCalendar", connected: false },
        { provider: "googleDrive", connected: false },
        { provider: "notion", connected: false },
        { provider: "microsoftEmail", connected: false },
        { provider: "microsoftCalendar", connected: false },
      ],
    })

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

describe("automation event parameter fields", () => {
  test("disables dependent option pickers until their parent is selected", () => {
    render(
      <EventFields
        tenantId="tenant"
        onValuesChange={() => undefined}
        values={{
          ...emptyAutomationForm,
          type: "event",
          eventProvider: "github",
          event: "issue.comment.changed",
          eventCriteria: {},
        }}
      />
    )

    expect(screen.getByLabelText("Issue").hasAttribute("disabled")).toBe(true)
    expect(screen.getByLabelText("Issue").textContent).toContain(
      "Choose repository first"
    )
  })
})
