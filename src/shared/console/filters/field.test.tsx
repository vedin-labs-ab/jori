// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ConsoleFilterToggle } from "./field"

afterEach(cleanup)

const filterOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
] as const

test("filter toggle reports a new selection and ignores deselecting the active option", () => {
  const onValueChange = vi.fn()

  render(
    <ConsoleFilterToggle
      label="Status"
      onValueChange={onValueChange}
      options={filterOptions}
      value="all"
    />
  )

  expect(screen.getByRole("radiogroup", { name: "Status" })).toBeDefined()

  fireEvent.click(screen.getByRole("radio", { name: "All" }))

  expect(onValueChange).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("radio", { name: "Active" }))

  expect(onValueChange).toHaveBeenCalledWith("active")
})
