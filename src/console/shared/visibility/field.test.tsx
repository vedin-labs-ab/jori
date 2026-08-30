// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { VisibilityField } from "./field"

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
}))

beforeEach(() => {
  Object.assign(HTMLElement.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  })
})

afterEach(cleanup)

function renderField(onChange: (visibility: unknown) => void) {
  render(
    <VisibilityField
      id="test-visibility"
      noun="table"
      onChange={onChange}
      organizationId="org-1"
      value={{ mode: "organization" }}
    />
  )
}

function openModeSelect() {
  fireEvent.click(screen.getByRole("combobox", { name: "Sharing" }))
}

test("selecting Public asks for confirmation before it takes", () => {
  const onChange = vi.fn()

  renderField(onChange)
  openModeSelect()
  fireEvent.click(screen.getByRole("option", { name: "Public" }))

  // Nothing changed yet: the confirmation gates the transition.
  expect(onChange).not.toHaveBeenCalled()
  expect(
    screen.getByText("Make this table public?", { exact: false })
  ).toBeDefined()
  expect(
    screen.getByText(/Anyone with the link can view this table/)
  ).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Make public" }))

  expect(onChange).toHaveBeenCalledWith({ mode: "public" })
})

test("cancelling the confirmation keeps the previous visibility", () => {
  const onChange = vi.fn()

  renderField(onChange)
  openModeSelect()
  fireEvent.click(screen.getByRole("option", { name: "Public" }))
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

  expect(onChange).not.toHaveBeenCalled()
})

test("other modes apply immediately", () => {
  const onChange = vi.fn()

  renderField(onChange)
  openModeSelect()
  fireEvent.click(screen.getByRole("option", { name: "Only me" }))

  expect(onChange).toHaveBeenCalledWith({ mode: "private" })
})
