// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { emptyJobForm } from "@/shared/console/jobs/types"
import { RecurringFields } from "./recurring"

const noop = () => undefined

afterEach(cleanup)

describe("recurring job fields", () => {
  test("shows repeat presets, a UTC time field, and a next-run preview", () => {
    render(<RecurringFields onValuesChange={noop} values={emptyJobForm} />)

    for (const label of ["Daily", "Weekdays", "Weekly", "Monthly", "Custom"]) {
      expect(screen.getByRole("radio", { name: label })).toBeDefined()
    }

    expect(screen.getByLabelText("Time (UTC)")).toBeDefined()
    expect(screen.getByText(/^Next run /)).toBeDefined()
  })

  test("shows a day picker for weekly jobs", () => {
    render(
      <RecurringFields
        onValuesChange={noop}
        values={{ ...emptyJobForm, repeat: "weekly", weekday: "3" }}
      />
    )

    expect(screen.getByRole("combobox", { name: "Day" })).toBeDefined()
    expect(screen.getByText("Wednesday")).toBeDefined()
  })

  test("keeps the raw cron input for custom jobs", () => {
    render(
      <RecurringFields
        onValuesChange={noop}
        values={{
          ...emptyJobForm,
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
        values={{ ...emptyJobForm, cron: "0 9 * *", repeat: "custom" }}
      />
    )

    expect(
      screen.getByText(
        "Cron expressions need five fields: minute, hour, day of month, month, day of week."
      )
    ).toBeDefined()
  })
})

describe("recurring job preview", () => {
  test("can hide the next-run preview", () => {
    render(
      <RecurringFields
        showRunPreview={false}
        onValuesChange={noop}
        values={emptyJobForm}
      />
    )

    expect(screen.queryByText(/^Next run /)).toBeNull()
  })
})
