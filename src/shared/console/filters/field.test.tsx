// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ConsoleFilterToggle } from "./field"

afterEach(cleanup)

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

test("a labelled toggle stacks its label above the group by default", () => {
  render(
    <ConsoleFilterToggle
      label="Status"
      onValueChange={() => {}}
      options={filterOptions}
      value="all"
    />
  )

  const field = screen.getByText("Status").parentElement

  expect(field?.className).toContain("flex-col")
  expect(screen.getByRole("radiogroup", { name: "Status" })).toBeDefined()
})

test("a form can borrow the toggle with its label inline", () => {
  render(
    <ConsoleFilterToggle
      inline
      label="Amount"
      onValueChange={() => {}}
      options={filterOptions}
      value="all"
    />
  )

  const field = screen.getByText("Amount").parentElement

  expect(field?.className).toContain("items-center")
  expect(field?.className).not.toContain("flex-col")
})
