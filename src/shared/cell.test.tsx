// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { CellError } from "./cell"

afterEach(cleanup)

test("cell feedback opens on hover without taking focus and dismisses with Escape", async () => {
  const view = render(
    <CellError message="Enter a whole number.">
      {(attributes) => <input {...attributes} aria-label="Count" />}
    </CellError>
  )
  const input = screen.getByRole("textbox", { name: "Count" })

  fireEvent.pointerMove(input, { pointerType: "mouse" })

  const tooltip = await screen.findByRole("tooltip")

  expect(tooltip.textContent).toBe("Enter a whole number.")
  expect(view.container.contains(tooltip)).toBe(false)
  expect(document.activeElement).not.toBe(input)
  fireEvent.keyDown(document, { key: "Escape" })
  await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull())

  act(() => input.focus())
  expect(await screen.findByRole("tooltip")).toBeTruthy()
  expect(document.activeElement).toBe(input)
  expect(input.getAttribute("aria-describedby")).toBe(
    screen.getByRole("alert").id
  )
})
