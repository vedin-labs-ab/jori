// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import {
  ConsoleFilterToggle,
  ConsoleHeaderButton,
  ConsoleSearch,
} from "./layout"

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
    <ConsoleSearch
      label="Search files"
      onValueChange={onValueChange}
      value=""
    />
  )

  const input = screen.getByRole("textbox", { name: "Search files" })

  expect(input.getAttribute("placeholder")).toBe("Search files")
  fireEvent.change(input, { target: { value: "report" } })

  expect(onValueChange).toHaveBeenCalledWith("report")
})

test("toolbar search can use a placeholder different from its label", () => {
  render(
    <ConsoleSearch
      label="Search runs"
      onValueChange={() => {}}
      placeholder="Search runs..."
      value=""
    />
  )

  const input = screen.getByRole("textbox", { name: "Search runs" })

  expect(input.getAttribute("placeholder")).toBe("Search runs...")
})

test("toolbar search exposes a compact mobile trigger", () => {
  render(
    <ConsoleSearch
      label="Search files"
      onValueChange={() => {}}
      value="report"
    />
  )

  const trigger = screen.getByRole("button", {
    name: "Search files: report",
  })

  expect(trigger.className).toContain("sm:hidden")
  expect(trigger.dataset.variant).toBe("secondary")
})

test("compact search opens an auto-focused search field", async () => {
  const onValueChange = vi.fn()

  render(
    <ConsoleSearch
      label="Search files"
      onValueChange={onValueChange}
      value=""
    />
  )

  fireEvent.click(screen.getByRole("button", { name: "Search files" }))

  const inputs = await screen.findAllByRole("textbox", {
    name: "Search files",
  })
  const compactInput = inputs.at(-1)
  const popover = compactInput?.closest('[data-slot="popover-content"]')

  expect(compactInput).toBe(document.activeElement)
  expect(popover?.className).toContain("bg-popover")
  expect(popover?.className).not.toContain("bg-transparent")
  expect(popover?.className).toContain("p-0")
  expect(popover?.className).toContain("shadow-none")
  expect(popover?.className).toContain("ring-0")
  fireEvent.change(compactInput as HTMLInputElement, {
    target: { value: "report" },
  })
  expect(onValueChange).toHaveBeenCalledWith("report")
})

test("header buttons keep their accessible label when compact", () => {
  render(
    <ConsoleHeaderButton
      icon={<svg aria-hidden />}
      label="New automation"
      type="button"
    />
  )

  const button = screen.getByRole("button", { name: "New automation" })
  const label = screen.getByText("New automation")

  expect(button.className).toContain("max-sm:size-7")
  expect(label.className).toContain("max-sm:hidden")
})
