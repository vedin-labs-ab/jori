// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { AutomationDateTimePicker } from "./picker"

afterEach(cleanup)

describe("automation date and time picker", () => {
  test("renders the selected local date and time", () => {
    render(
      <AutomationDateTimePicker
        id="run-at"
        onValueChange={() => undefined}
        value="2026-01-15T13:45"
      />
    )

    const timeInput = screen.getByLabelText("Time") as HTMLInputElement

    expect(screen.getByLabelText("Date").textContent).toContain("2026")
    expect(timeInput.value).toBe("13:45")
  })

  test("updates the datetime value when the time changes", () => {
    const onValueChange = vi.fn()

    render(
      <AutomationDateTimePicker
        id="run-at"
        onValueChange={onValueChange}
        value="2026-01-15T13:45"
      />
    )

    fireEvent.change(screen.getByLabelText("Time"), {
      target: { value: "14:30" },
    })

    expect(onValueChange).toHaveBeenCalledWith("2026-01-15T14:30")
  })

  test("keeps a pending time while waiting for a date", () => {
    const onValueChange = vi.fn()

    render(
      <AutomationDateTimePicker
        id="run-at"
        onValueChange={onValueChange}
        value=""
      />
    )

    fireEvent.change(screen.getByLabelText("Time"), {
      target: { value: "10:15" },
    })

    expect(screen.getByRole("button", { name: /select date/i })).toBeDefined()
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
