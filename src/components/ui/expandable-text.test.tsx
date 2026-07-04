// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test, vi } from "vitest"
import { ExpandableText } from "./expandable-text"

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const longText =
  "Milo watches the conversations that matter, gathers the right context, and helps teams move work forward."

function mockOverflowingContent() {
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(96)
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(48)
}

test("hides the control when the text fits", () => {
  render(<ExpandableText maxLines={2}>{longText}</ExpandableText>)

  expect(screen.getByText(longText)).toBeDefined()
  expect(screen.queryByRole("button")).toBeNull()
})

test("shows the control only when the clamped text overflows", () => {
  mockOverflowingContent()

  render(<ExpandableText maxLines={2}>{longText}</ExpandableText>)

  const control = screen.getByRole("button", { name: "Show more" })

  expect(control.getAttribute("aria-expanded")).toBe("false")
})

test("expands and collapses through the same control", () => {
  mockOverflowingContent()

  render(<ExpandableText maxLines={2}>{longText}</ExpandableText>)

  const control = screen.getByRole("button", { name: "Show more" })
  fireEvent.click(control)

  expect(control.getAttribute("aria-expanded")).toBe("true")
  expect(control.textContent).toBe("Show less")

  fireEvent.click(control)

  expect(control.getAttribute("aria-expanded")).toBe("false")
  expect(control.textContent).toBe("Show more")
})

test("supports defaultExpanded and custom labels", () => {
  mockOverflowingContent()

  render(
    <ExpandableText defaultExpanded lessLabel="Collapse" moreLabel="Expand">
      {longText}
    </ExpandableText>
  )

  const control = screen.getByRole("button", { name: "Collapse" })

  expect(control.getAttribute("aria-expanded")).toBe("true")

  fireEvent.click(control)

  expect(screen.getByRole("button", { name: "Expand" })).toBeDefined()
})
