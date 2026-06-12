// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { emptyAutomationForm } from "../types"
import { RecurringFields } from "./recurring"

const noop = () => undefined

afterEach(cleanup)

describe("recurring automation fields", () => {
  test("shows repeat presets, a UTC time field, and a next-run preview", () => {
    render(
      <RecurringFields onValuesChange={noop} values={emptyAutomationForm} />
    )

    for (const label of ["Daily", "Weekdays", "Weekly", "Monthly", "Custom"]) {
      expect(screen.getByRole("radio", { name: label })).toBeDefined()
    }

    expect(screen.getByLabelText("Time (UTC)")).toBeDefined()
    expect(screen.getByText(/^Next run /)).toBeDefined()
  })

  test("shows a day picker for weekly automations", () => {
    render(
      <RecurringFields
        onValuesChange={noop}
        values={{ ...emptyAutomationForm, repeat: "weekly", weekday: "3" }}
      />
    )

    expect(screen.getByRole("combobox", { name: "Day" })).toBeDefined()
    expect(screen.getByText("Wednesday")).toBeDefined()
  })

  test("keeps the raw cron input for custom automations", () => {
    render(
      <RecurringFields
        onValuesChange={noop}
        values={{
          ...emptyAutomationForm,
          cron: "*/5 * * * *",
          repeat: "custom",
        }}
      />
    )

    const input = screen.getByLabelText("Expression")
    expect(input.getAttribute("value")).toBe("*/5 * * * *")
    expect(
      screen.getByRole("button", { name: "Expression help" })
    ).toBeDefined()
    expect(
      screen.queryByText("UTC: minute, hour, day, month, weekday.")
    ).toBeNull()
    expect(screen.getByText(/^Next run /)).toBeDefined()
  })

  test("surfaces cron validation errors inline", () => {
    render(
      <RecurringFields
        onValuesChange={noop}
        values={{ ...emptyAutomationForm, cron: "0 9 * *", repeat: "custom" }}
      />
    )

    expect(
      screen.getByText(
        "Cron expressions need five fields: minute, hour, day of month, month, day of week."
      )
    ).toBeDefined()
  })
})
