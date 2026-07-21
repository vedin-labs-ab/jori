// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { EditableText } from "./editable"

afterEach(cleanup)

test("edits the current value and only saves a changed non-empty draft", () => {
  const onSave = vi.fn()
  render(
    <EditableText label="Organization name" onSave={onSave} value="Milo" />
  )

  fireEvent.click(
    screen.getByRole("button", { name: "Edit organization name: Milo" })
  )

  const input = screen.getByRole("textbox", { name: "Organization name" })
  const save = screen.getByRole("button", { name: "Save" })
  expect(document.activeElement).toBe(input)
  expect((input as HTMLInputElement).value).toBe("Milo")
  expect((save as HTMLButtonElement).disabled).toBe(true)

  fireEvent.change(input, { target: { value: "  " } })
  expect((save as HTMLButtonElement).disabled).toBe(true)

  fireEvent.change(input, { target: { value: "Milo Labs" } })
  expect((save as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(save)

  expect(onSave).toHaveBeenCalledWith("Milo Labs")
})

test("cancel restores the value and focus without bubbling Escape", () => {
  const onKeyDown = vi.fn()
  render(
    <div onKeyDown={onKeyDown}>
      <EditableText label="Organization name" onSave={vi.fn()} value="Milo" />
    </div>
  )

  fireEvent.click(
    screen.getByRole("button", { name: "Edit organization name: Milo" })
  )
  const input = screen.getByRole("textbox", { name: "Organization name" })
  fireEvent.change(input, { target: { value: "Changed" } })
  fireEvent.keyDown(input, { key: "Escape" })

  expect(onKeyDown).not.toHaveBeenCalled()
  const trigger = screen.getByRole("button", {
    name: "Edit organization name: Milo",
  })
  expect(trigger.textContent).toContain("Milo")
  expect(document.activeElement).toBe(trigger)
})

test("supports transform and size presets", () => {
  const onSave = vi.fn()
  const { container } = render(
    <EditableText
      label="Slug"
      onSave={onSave}
      size="xl"
      transform={(value) => value.toLowerCase().replaceAll(" ", "-")}
      value="milo"
    />
  )

  expect(
    container.querySelector('[data-slot="editable-text"]')?.getAttribute(
      "data-size"
    )
  ).toBe("xl")
  fireEvent.click(screen.getByRole("button", { name: "Edit slug: milo" }))
  const input = screen.getByRole("textbox", { name: "Slug" })
  fireEvent.change(input, { target: { value: "Milo Labs" } })
  expect((input as HTMLInputElement).value).toBe("milo-labs")
})
