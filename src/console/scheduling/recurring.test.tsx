// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { RecurringFields } from "./recurring"
import { emptyScheduleForm } from "./types"

const noop = () => undefined

afterEach(cleanup)

describe("recurring schedule fields", () => {
  test("shows repeat presets, a UTC time field, and a next-run preview", () => {
    render(<RecurringFields onValuesChange={noop} values={emptyScheduleForm} />)

    for (const label of ["Daily", "Weekdays", "Weekly", "Monthly", "Custom"]) {
      expect(screen.getByRole("radio", { name: label })).toBeDefined()
    }

    expect(screen.getByLabelText("Time (UTC)")).toBeDefined()
    expect(screen.getByText(/^Next run /)).toBeDefined()
  })

  test("shows a day picker for weekly schedules", () => {
    render(
      <RecurringFields
        onValuesChange={noop}
        values={{ ...emptyScheduleForm, repeat: "weekly", weekday: "3" }}
      />
    )

    expect(screen.getByRole("combobox", { name: "Day" })).toBeDefined()
    expect(screen.getByText("Wednesday")).toBeDefined()
  })

  test("keeps the raw cron input for custom schedules", () => {
    render(
      <RecurringFields
        onValuesChange={noop}
        values={{ ...emptyScheduleForm, cron: "*/5 * * * *", repeat: "custom" }}
      />
    )

    const input = screen.getByLabelText("Cron expression")
    expect(input.getAttribute("value")).toBe("*/5 * * * *")
    expect(screen.getByText(/^Next run /)).toBeDefined()
  })

  test("surfaces cron validation errors inline", () => {
    render(
      <RecurringFields
        onValuesChange={noop}
        values={{ ...emptyScheduleForm, cron: "0 9 * *", repeat: "custom" }}
      />
    )

    expect(
      screen.getByText(
        "Cron expressions need five fields: minute, hour, day of month, month, day of week."
      )
    ).toBeDefined()
  })
})
