// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { AddDomainControl } from "./add"

const declareDomain = vi.hoisted(() => vi.fn())

vi.mock("convex/react", () => ({ useMutation: () => declareDomain }))

beforeEach(() => {
  declareDomain.mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  declareDomain.mockReset()
})

test("Escape closes domain entry without escaping its containing view and returns focus", () => {
  const onKeyDown = vi.fn()
  render(
    <div aria-label="Organization context" onKeyDown={onKeyDown} role="dialog">
      <AddDomainControl organizationId="organization" />
    </div>
  )
  fireEvent.click(screen.getByRole("button", { name: "Add" }))
  const input = screen.getByRole("textbox", { name: "Domain to add" })
  expect(document.activeElement).toBe(input)
  fireEvent.keyDown(input, { key: "Escape" })
  expect(onKeyDown).not.toHaveBeenCalled()
  expect(screen.queryByRole("textbox")).toBeNull()
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Add" })
  )
})

test("domain validation describes its input and successful submission restores focus", async () => {
  render(<AddDomainControl organizationId="organization" />)
  fireEvent.click(screen.getByRole("button", { name: "Add" }))
  const input = screen.getByRole("textbox", { name: "Domain to add" })
  fireEvent.change(input, { target: { value: "localhost" } })
  fireEvent.click(screen.getByRole("button", { name: "Add" }))
  const error = screen.getByRole("alert")
  expect(input.getAttribute("aria-describedby")).toBe(error.id)
  expect(input.getAttribute("aria-invalid")).toBe("true")
  expect(declareDomain).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { value: "example.com" } })
  expect(input.getAttribute("aria-describedby")).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Add" }))
  await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull())
  expect(declareDomain).toHaveBeenCalledWith({
    organizationId: "organization",
    domain: "example.com",
  })
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Add" })
  )
})
