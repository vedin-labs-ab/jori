// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ConsoleFilterToggle, ConsoleToolbarSearch } from "./layout"

afterEach(() => {
  cleanup()
})

const filterOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
] as const

test("filter toggle renders every option and reports selections", () => {
  const onValueChange = vi.fn()

  render(
    <ConsoleFilterToggle
      onValueChange={onValueChange}
      options={filterOptions}
      value="all"
    />
  )

  fireEvent.click(screen.getByRole("radio", { name: "Active" }))

  expect(onValueChange).toHaveBeenCalledWith("active")
})

test("filter toggle ignores deselecting the active option", () => {
  const onValueChange = vi.fn()

  render(
    <ConsoleFilterToggle
      onValueChange={onValueChange}
      options={filterOptions}
      value="all"
    />
  )

  fireEvent.click(screen.getByRole("radio", { name: "All" }))

  expect(onValueChange).not.toHaveBeenCalled()
})

test("toolbar search labels the input and reports typed values", () => {
  const onValueChange = vi.fn()

  render(
    <ConsoleToolbarSearch
      label="Search artifacts"
      onValueChange={onValueChange}
      value=""
    />
  )

  const input = screen.getByRole("textbox", { name: "Search artifacts" })

  expect(input.getAttribute("placeholder")).toBe("Search artifacts")
  fireEvent.change(input, { target: { value: "report" } })

  expect(onValueChange).toHaveBeenCalledWith("report")
})

test("toolbar search can use a placeholder different from its label", () => {
  render(
    <ConsoleToolbarSearch
      label="Search runs"
      onValueChange={() => {}}
      placeholder="Search runs..."
      value=""
    />
  )

  const input = screen.getByRole("textbox", { name: "Search runs" })

  expect(input.getAttribute("placeholder")).toBe("Search runs...")
})
