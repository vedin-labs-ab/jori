// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { EditableText } from "./editable"

afterEach(cleanup)

test("edits the current value and only saves a changed non-empty draft", () => {
  const onSave = vi.fn()
  render(
    <EditableText label="Organization name" onSave={onSave} value="Jori" />
  )

  fireEvent.click(
    screen.getByRole("button", { name: "Edit organization name: Jori" })
  )

  const input = screen.getByRole("textbox", { name: "Organization name" })
  const save = screen.getByRole("button", { name: "Save" })
  expect(document.activeElement).toBe(input)
  expect((input as HTMLInputElement).value).toBe("Jori")
  expect((save as HTMLButtonElement).disabled).toBe(true)

  fireEvent.change(input, { target: { value: "  " } })
  expect((save as HTMLButtonElement).disabled).toBe(true)

  fireEvent.change(input, { target: { value: "Jori Labs" } })
  expect((save as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(save)

  expect(onSave).toHaveBeenCalledWith("Jori Labs")
})

test("cancel restores the value and focus without bubbling Escape", () => {
  const onKeyDown = vi.fn()
  render(
    <div onKeyDown={onKeyDown}>
      <EditableText label="Organization name" onSave={vi.fn()} value="Jori" />
    </div>
  )

  fireEvent.click(
    screen.getByRole("button", { name: "Edit organization name: Jori" })
  )
  const input = screen.getByRole("textbox", { name: "Organization name" })
  fireEvent.change(input, { target: { value: "Changed" } })
  fireEvent.keyDown(input, { key: "Escape" })

  expect(onKeyDown).not.toHaveBeenCalled()
  const trigger = screen.getByRole("button", {
    name: "Edit organization name: Jori",
  })
  expect(trigger.textContent).toContain("Jori")
  expect(document.activeElement).toBe(trigger)
})

test("transforms a draft before saving", () => {
  const onSave = vi.fn()
  render(
    <EditableText
      label="Slug"
      onSave={onSave}
      transform={(value) => value.toLowerCase().replaceAll(" ", "-")}
      value="jori"
    />
  )

  fireEvent.click(screen.getByRole("button", { name: "Edit slug: jori" }))
  const input = screen.getByRole("textbox", { name: "Slug" })
  fireEvent.change(input, { target: { value: "Jori Labs" } })
  expect((input as HTMLInputElement).value).toBe("jori-labs")
  fireEvent.click(screen.getByRole("button", { name: "Save" }))
  expect(onSave).toHaveBeenCalledWith("jori-labs")
})
