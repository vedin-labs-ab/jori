// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { VisibilityField } from "./field"

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
      options={{ people: undefined, teams: undefined }}
      value={{ mode: "organization" }}
    />
  )
}

function openModeSelect() {
  fireEvent.click(screen.getByRole("combobox", { name: "Visibility" }))
}

test("every offered mode keeps the audience inside the organization", () => {
  renderField(vi.fn())
  openModeSelect()

  expect(screen.queryByRole("option", { name: "Public" })).toBeNull()
  expect(screen.getAllByRole("option")).toHaveLength(4)
})

test("choosing a mode applies immediately", () => {
  const onChange = vi.fn()

  renderField(onChange)
  openModeSelect()
  fireEvent.click(screen.getByRole("option", { name: "Only me" }))

  expect(onChange).toHaveBeenCalledWith({ mode: "private" })
})

test("choosing specific people starts from an empty grant list", () => {
  const onChange = vi.fn()

  renderField(onChange)
  openModeSelect()
  fireEvent.click(screen.getByRole("option", { name: "Specific people" }))

  expect(onChange).toHaveBeenCalledWith({ mode: "people", personIds: [] })
})
