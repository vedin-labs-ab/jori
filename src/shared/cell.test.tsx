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

function field(message: string | undefined) {
  return (
    <CellError message={message}>
      {(attributes) => <input {...attributes} aria-label="Count" />}
    </CellError>
  )
}

function clickInput(input: HTMLElement) {
  fireEvent.pointerMove(input, { pointerType: "mouse" })
  fireEvent.pointerDown(input, { pointerType: "mouse", button: 0 })
  act(() => input.focus())
  fireEvent.pointerUp(input, { pointerType: "mouse", button: 0 })
  fireEvent.click(input, { button: 0 })
}

test("cell feedback opens on hover without taking focus and dismisses with Escape", async () => {
  const view = render(field("Enter a whole number."))
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

test("a clicked editor shows later validation and keeps it visible on re-click", async () => {
  const view = render(field(undefined))
  const input = screen.getByRole("textbox", { name: "Count" })

  clickInput(input)
  view.rerender(field("Enter a whole number."))

  expect(await screen.findByRole("tooltip")).toBeTruthy()
  expect(document.activeElement).toBe(input)

  clickInput(input)

  expect(screen.getByRole("tooltip")).toBeTruthy()
  expect(document.activeElement).toBe(input)

  fireEvent.keyDown(input, { key: "Escape" })
  await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull())
  expect(document.activeElement).toBe(input)
})

test("a nested cell's focus does not keep its parent tooltip open", async () => {
  render(
    <CellError message="Group error.">
      {() => field("Enter a whole number.")}
    </CellError>
  )
  const input = screen.getByRole("textbox", { name: "Count" })

  clickInput(input)

  await waitFor(() => {
    expect(screen.getAllByRole("tooltip")).toHaveLength(1)
    expect(screen.getByRole("tooltip").textContent).toBe(
      "Enter a whole number."
    )
  })
  expect(document.activeElement).toBe(input)
})
