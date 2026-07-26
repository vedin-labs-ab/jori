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

test("supports transform and size presets", () => {
  const onSave = vi.fn()
  const { container } = render(
    <EditableText
      label="Slug"
      onSave={onSave}
      size="xl"
      transform={(value) => value.toLowerCase().replaceAll(" ", "-")}
      value="jori"
    />
  )

  expect(
    container.querySelector('[data-slot="editable-text"]')?.getAttribute(
      "data-size"
    )
  ).toBe("xl")
  fireEvent.click(screen.getByRole("button", { name: "Edit slug: jori" }))
  const input = screen.getByRole("textbox", { name: "Slug" })
  fireEvent.change(input, { target: { value: "Jori Labs" } })
  expect((input as HTMLInputElement).value).toBe("jori-labs")
})

test("uses flush, quiet interaction styling for the idle trigger", () => {
  render(
    <EditableText label="Organization name" onSave={vi.fn()} value="Jori" />
  )

  const trigger = screen.getByRole("button", {
    name: "Edit organization name: Jori",
  })
  const label = trigger.querySelector("span")
  const icon = trigger.querySelector("svg")

  expect(trigger.className).toContain("px-0")
  expect(trigger.className).toContain("hover:bg-transparent")
  expect(label?.className).toContain("group-hover/editable:underline")
  expect(label?.className).not.toContain("opacity")
  expect(icon?.getAttribute("class")).toContain(
    "group-hover/editable:text-foreground"
  )
})

test("scales the edit icon with each text size", () => {
  const { rerender } = render(
    <EditableText label="Name" onSave={vi.fn()} size="sm" value="Jori" />
  )

  for (const [size, expectedClass] of [
    ["sm", "size-3"],
    ["md", "size-3.5"],
    ["lg", "size-4"],
    ["xl", "size-4.5"],
  ] as const) {
    rerender(
      <EditableText label="Name" onSave={vi.fn()} size={size} value="Jori" />
    )

    const icon = screen
      .getByRole("button", { name: "Edit name: Jori" })
      .querySelector("svg")
    expect(icon?.classList.contains(expectedClass)).toBe(true)
  }
})
