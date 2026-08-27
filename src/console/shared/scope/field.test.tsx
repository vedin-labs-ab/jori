// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ScopeField } from "./field"

afterEach(() => {
  cleanup()
})

const help = {
  organization: "everyone in the organization can see and use this table.",
  personal: "only you can see and use this table.",
}

test("labels the field Sharing with a keyboard-reachable help hint", () => {
  render(
    <ScopeField
      help={help}
      id="scope"
      onValueChange={() => {}}
      value="personal"
    />
  )

  expect(screen.getByText("Sharing")).toBeDefined()
  expect(screen.getByRole("button", { name: "Sharing help" })).toBeDefined()
})

test("offers both audiences and reports the selection", () => {
  const onValueChange = vi.fn()

  render(
    <ScopeField
      help={help}
      id="scope"
      onValueChange={onValueChange}
      value="personal"
    />
  )

  fireEvent.click(screen.getByRole("radio", { name: "Organization" }))

  expect(onValueChange).toHaveBeenCalledWith("organization")
})

test("ignores deselecting the active audience", () => {
  const onValueChange = vi.fn()

  render(
    <ScopeField
      help={help}
      id="scope"
      onValueChange={onValueChange}
      value="personal"
    />
  )

  fireEvent.click(screen.getByRole("radio", { name: "Personal" }))

  expect(onValueChange).not.toHaveBeenCalled()
})
