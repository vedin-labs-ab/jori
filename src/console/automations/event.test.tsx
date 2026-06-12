// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { EventFields } from "./event"
import { emptyAutomationForm } from "./types"

vi.mock("convex/react", () => ({
  useAction: () => vi.fn(),
}))

afterEach(() => {
  cleanup()
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
