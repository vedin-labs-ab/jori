// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { FieldError } from "./field"

afterEach(cleanup)

test("reserved validation keeps its node and announces only the actual error", () => {
  const { container, rerender } = render(<FieldError reserve />)
  const slot = container.querySelector('[data-slot="field-error"]')

  expect(slot).not.toBeNull()
  expect(screen.queryByRole("alert")).toBeNull()

  rerender(<FieldError reserve>Name is required.</FieldError>)

  expect(screen.getByRole("alert")).toBe(slot)
  expect(screen.getByRole("alert").textContent).toBe("Name is required.")

  rerender(<FieldError reserve />)

  expect(container.querySelector('[data-slot="field-error"]')).toBe(slot)
  expect(screen.queryByRole("alert")).toBeNull()
})

test("the default field error remains absent when there is no message", () => {
  const { container } = render(<FieldError />)

  expect(container.firstChild).toBeNull()
})
