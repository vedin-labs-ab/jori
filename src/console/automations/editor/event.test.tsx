// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { emptyAutomationForm } from "../types"
import { EventFields } from "./event"
import { getProviderOptions } from "./provider/options"

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
  Object.assign(HTMLElement.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  })
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
    convexMocks.useQuery.mockReturnValue(providerConnections("github"))

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
    convexMocks.useQuery.mockReturnValue(providerConnections())

    renderEventFields({ eventProvider: "slack", event: "message.created" })

    openProviderPicker()

    expect(screen.getByRole("option", { name: /Slack/ })).toBeDefined()
    expect(screen.getAllByText("Not connected").length).toBeGreaterThan(0)
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

function openProviderPicker() {
  fireEvent.pointerDown(screen.getByLabelText("Integration"), {
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
  })
}

function renderEventFields(
  values: Partial<typeof emptyAutomationForm> = {},
  onValuesChange: (values: typeof emptyAutomationForm) => void = () => undefined
) {
  render(
    <EventFields
      tenantId="tenant"
      onValuesChange={onValuesChange}
      values={{
        ...emptyAutomationForm,
        type: "event",
        ...values,
      }}
    />
  )
}

function providerConnections(connectedProvider?: string) {
  return {
    providers: [
      "slack",
      "linear",
      "github",
      "gmail",
      "googleCalendar",
      "googleDrive",
      "notion",
      "microsoftEmail",
      "microsoftCalendar",
    ].map((provider) => ({
      provider,
      connected: provider === connectedProvider,
    })),
  }
}

describe("automation event conditions", () => {
  test("hides optional parameters until they are added as conditions", () => {
    renderEventFields({
      eventProvider: "linear",
      event: "issue.comment.changed",
    })

    expect(screen.queryByLabelText("Team")).toBeNull()
    expect(screen.queryByLabelText("Project")).toBeNull()
    expect(screen.queryByLabelText("Issue")).toBeNull()
    expect(screen.queryByText("Scope")).toBeNull()
    expect(screen.queryByText("Choose where this applies.")).toBeNull()
    expect(screen.getByText("Conditions")).toBeDefined()
    expect(screen.getByRole("button", { name: "Add condition" })).toBeDefined()
    expect(
      screen.queryByText(
        "Runs when someone creates or updates a comment on a matching Linear issue."
      )
    ).toBeNull()
  })

  test("shows required scope fields without an add button when every parameter is required", () => {
    renderEventFields({ eventProvider: "slack", event: "message.created" })

    expect(screen.getByLabelText("Channel")).toBeDefined()
    expect(screen.queryByText("Scope")).toBeNull()
    expect(screen.queryByRole("button", { name: "Add condition" })).toBeNull()
    expect(screen.queryByText("Conditions")).toBeNull()
  })

  test("shows conditions that already have values", () => {
    renderEventFields({
      eventProvider: "linear",
      event: "issue.comment.changed",
      eventCriteria: {
        issue: "issue-a",
        project: "project-a",
        team: "team-a",
      },
    })

    expect(screen.getByLabelText("Team")).toBeDefined()
    expect(screen.getByLabelText("Project")).toBeDefined()
    expect(screen.getByLabelText("Issue")).toBeDefined()
    expect(screen.getByLabelText("Project").hasAttribute("disabled")).toBe(
      false
    )
    expect(screen.queryByRole("button", { name: "Add condition" })).toBeNull()
  })
})

describe("automation event condition editing", () => {
  test("adds a condition from the add-condition menu", () => {
    renderEventFields({
      eventProvider: "linear",
      event: "issue.comment.changed",
    })

    openAddConditionMenu()

    expect(
      screen.getByText("Narrows runs to issues in the selected team.")
    ).toBeDefined()

    fireEvent.click(screen.getByRole("menuitem", { name: /Team/ }))

    expect(screen.getByLabelText("Team")).toBeDefined()
    expect(screen.getByLabelText("Team").hasAttribute("disabled")).toBe(false)
    expect(screen.getByLabelText("Team").className).toContain("basis-0")
    expect(screen.getByRole("group", { name: "Team condition" })).toBeDefined()
    expect(screen.queryByText("Conditions")).toBeNull()
    expect(
      screen.queryByText("Narrows runs to issues in the selected team.")
    ).toBeNull()
  })

  test("removes a condition and clears its criteria value", () => {
    const onValuesChange = vi.fn()

    renderEventFields(
      {
        eventProvider: "linear",
        event: "issue.comment.changed",
        eventCriteria: { team: "team-a" },
      },
      onValuesChange
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Team condition" })
    )

    expect(screen.queryByLabelText("Team")).toBeNull()
    expect(onValuesChange).toHaveBeenCalledWith(
      expect.objectContaining({ eventCriteria: {} })
    )
  })

  test("disables dependent condition pickers until their parent is selected", () => {
    renderEventFields({
      eventProvider: "github",
      event: "issue.comment.changed",
    })

    openAddConditionMenu()
    fireEvent.click(screen.getByRole("menuitem", { name: /Issue/ }))

    expect(screen.getByLabelText("Issue").hasAttribute("disabled")).toBe(true)
    expect(screen.getByLabelText("Issue").textContent).toContain(
      "Choose repository first"
    )
  })
})

function openAddConditionMenu() {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Add condition" }), {
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
  })
}
