// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { ScheduleInstructionsField } from "./instructions"

afterEach(cleanup)

describe("schedule instructions field autocomplete", () => {
  test("suggests an integration marker while typing", () => {
    const field = renderInstructionsField()

    changeInput(field.input, "Send @li", 8)
    field.rerender("Send @li")

    expect(screen.getByRole("option", { name: "@Linear" })).toBeDefined()
  })

  test("suggests bare provider words after three characters", () => {
    const field = renderInstructionsField()

    changeInput(field.input, "Send gi", 7)
    field.rerender("Send gi")

    expect(screen.queryByRole("option")).toBeNull()

    changeInput(field.input, "Send git", 8)
    field.rerender("Send git")

    expect(screen.getByRole("option", { name: "@GitHub" })).toBeDefined()
  })

  test("accepts the active suggestion with enter", () => {
    const field = renderInstructionsField()

    changeInput(field.input, "Send @li", 8)
    field.rerender("Send @li")
    fireEvent.keyDown(field.input, { key: "Enter" })

    expect(field.onValueChange).toHaveBeenLastCalledWith("Send @Linear ")
  })

  test("accepts a bare provider suggestion with enter", () => {
    const field = renderInstructionsField()

    changeInput(field.input, "Send git", 8)
    field.rerender("Send git")
    fireEvent.keyDown(field.input, { key: "Enter" })

    expect(field.onValueChange).toHaveBeenLastCalledWith("Send @GitHub ")
  })
})

describe("schedule instructions field normalization", () => {
  test("canonicalizes a completed marker when a boundary is typed", () => {
    const field = renderInstructionsField()

    changeInput(field.input, "Post to @github ", 16)

    expect(field.onValueChange).toHaveBeenLastCalledWith("Post to @GitHub ")
  })

  test("canonicalizes a completed bare provider when a boundary is typed", () => {
    const field = renderInstructionsField()

    changeInput(field.input, "Post to github ", 15)

    expect(field.onValueChange).toHaveBeenLastCalledWith("Post to @GitHub ")
  })
})

describe("schedule instructions field highlighting", () => {
  test("keeps marker highlights metric-safe for caret alignment", () => {
    const field = renderInstructionsField("Post to @GitHub")
    const marker = field.container.querySelector(
      '[aria-hidden="true"] span[class*="text-informational"]'
    )

    expect(marker?.className).toContain("underline")
    expect(marker?.className).not.toMatch(/\b(bg|font|px|ring)-/)
  })
})

function renderInstructionsField(value = "") {
  const onValueChange = vi.fn()
  const view = renderInstructionsFieldWithValue(value, onValueChange)

  return {
    container: view.container,
    input: screen.getByRole("textbox") as HTMLTextAreaElement,
    onValueChange,
    rerender: (value: string) =>
      view.rerender(createInstructionsField(value, onValueChange)),
  }
}

function renderInstructionsFieldWithValue(
  value: string,
  onValueChange: (value: string) => void
) {
  return render(createInstructionsField(value, onValueChange))
}

function createInstructionsField(
  value: string,
  onValueChange: (value: string) => void
) {
  return (
    <ScheduleInstructionsField
      id="instructions"
      onBlur={vi.fn()}
      onValueChange={onValueChange}
      placeholder="Instructions"
      rows={4}
      value={value}
    />
  )
}

function changeInput(
  input: HTMLTextAreaElement,
  value: string,
  cursor: number
) {
  fireEvent.change(input, {
    target: {
      selectionEnd: cursor,
      selectionStart: cursor,
      value,
    },
  })
}
