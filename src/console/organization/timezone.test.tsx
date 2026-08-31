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

/** Typing as a keyboard does: over the selection, not around it. */
function type(input: HTMLInputElement, text: string) {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? start
  const value = input.value.slice(0, start) + text + input.value.slice(end)

  // The combobox opens on typed input alone, which it tells apart from a
  // browser autofill by the insertion type the event carries.
  fireEvent.input(input, { inputType: "insertText", target: { value } })
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

  input.focus()
  type(input, "new york")

  expect(input.value).toBe("new york")

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

test("leaving the search unpicked puts the declared zone back", async () => {
  const input = renderField("Europe/Stockholm")

  input.focus()
  type(input, "new york")

  await waitFor(() =>
    expect(
      screen.getByRole("option", { name: "America/New York" })
    ).toBeDefined()
  )

  fireEvent.keyDown(input, { key: "Escape" })

  await waitFor(() => expect(input.value).toBe("Europe/Stockholm"))
})
