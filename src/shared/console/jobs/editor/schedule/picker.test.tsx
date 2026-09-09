// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { JobDateTimePicker } from "./picker"

afterEach(cleanup)

describe("job date and time picker", () => {
  test("shows the selected date and changes its time", () => {
    const onValueChange = vi.fn()

    render(
      <JobDateTimePicker
        id="run-at"
        onValueChange={onValueChange}
        timezone="Europe/Stockholm"
        value="2026-01-15T13:45"
      />
    )

    const time = screen.getByLabelText(
      "Time (Europe/Stockholm)"
    ) as HTMLInputElement

    expect(screen.getByLabelText("Date").textContent).toContain("2026")
    expect(time.value).toBe("13:45")

    fireEvent.change(time, { target: { value: "14:30" } })

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
