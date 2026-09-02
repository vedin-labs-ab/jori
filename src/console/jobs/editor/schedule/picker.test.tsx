// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { JobDateTimePicker } from "./picker"

afterEach(cleanup)

describe("job date and time picker", () => {
  test("renders the selected local date and time", () => {
    render(
      <JobDateTimePicker
        id="run-at"
        onValueChange={() => undefined}
        timezone="Europe/Stockholm"
        value="2026-01-15T13:45"
      />
    )

    const timeInput = screen.getByLabelText(
      "Time (Europe/Stockholm)"
    ) as HTMLInputElement

    expect(screen.getByLabelText("Date").textContent).toContain("2026")
    expect(screen.getByText("(Europe/Stockholm)").className).toBe(
      "font-normal text-muted-foreground"
    )
    expect(timeInput.value).toBe("13:45")
  })

  test("updates the datetime value when the time changes", () => {
    const onValueChange = vi.fn()

    render(
      <JobDateTimePicker
        id="run-at"
        onValueChange={onValueChange}
        timezone="Europe/Stockholm"
        value="2026-01-15T13:45"
      />
    )

    fireEvent.change(screen.getByLabelText("Time (Europe/Stockholm)"), {
      target: { value: "14:30" },
    })

    expect(onValueChange).toHaveBeenCalledWith("2026-01-15T14:30")
  })

  test("keeps a pending time while waiting for a date", () => {
    const onValueChange = vi.fn()

    render(
      <JobDateTimePicker
        id="run-at"
        onValueChange={onValueChange}
        timezone="Europe/Stockholm"
        value=""
      />
    )

    fireEvent.change(screen.getByLabelText("Time (Europe/Stockholm)"), {
      target: { value: "10:15" },
    })

    expect(screen.getByRole("button", { name: /select date/i })).toBeDefined()
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
