// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { EventFields } from "./event"
import { emptyAutomationForm } from "./types"

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
          eventProvider: "notion",
          event: "page.updated",
        }}
      />
    )

    expect(screen.getByLabelText("Event").hasAttribute("disabled")).toBe(true)
  })
})
