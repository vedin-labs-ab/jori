// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { TimezoneField } from "./timezone"

beforeEach(() => {
  Object.assign(HTMLElement.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  })
})

afterEach(cleanup)

function renderField(value: string, onChange = vi.fn()) {
  render(
    <TimezoneField
      description="Days in usage and reports follow this zone."
      id="timezone"
      onChange={onChange}
      value={value}
    />
  )

  return screen.getByLabelText<HTMLInputElement>("Timezone")
}

test("stands filled with the zone it was given", () => {
  const input = renderField("Europe/Stockholm")

  expect(input.value).toBe("Europe/Stockholm")
  expect(
    screen.getByText("Days in usage and reports follow this zone.")
  ).toBeDefined()
})

test("searching by the readable name finds the underscored zone", async () => {
  const onChange = vi.fn()
  const input = renderField("Europe/Stockholm", onChange)

  fireEvent.keyDown(input, { key: "ArrowDown" })
  fireEvent.change(input, { target: { value: "new york" } })

  await waitFor(() =>
    expect(
      screen.getByRole("option", { name: "America/New York" })
    ).toBeDefined()
  )
  fireEvent.click(screen.getByRole("option", { name: "America/New York" }))

  expect(onChange).toHaveBeenCalledWith("America/New_York")
})

test("a zone the platform's own list omits stays selectable", async () => {
  // Which aliases the supported-values list carries is the platform's call
  // and it varies; whatever the browser reports has to remain pickable.
  const input = renderField("US/Pacific")

  expect(input.value).toBe("US/Pacific")

  fireEvent.keyDown(input, { key: "ArrowDown" })

  await waitFor(() =>
    expect(screen.getByRole("option", { name: "US/Pacific" })).toBeDefined()
  )
})
