// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ExpandableText } from "./expandable-text"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const longText =
  "Jori watches the conversations that matter, gathers the right context, and helps teams move work forward."

function mockOverflowingContent() {
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(96)
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(48)
}

test("hides the control when the text fits", () => {
  render(<ExpandableText maxLines={2}>{longText}</ExpandableText>)

  expect(screen.getByText(longText)).toBeDefined()
  expect(screen.queryByRole("button")).toBeNull()
})

test("ignores text clicks while the user is selecting", () => {
  mockOverflowingContent()
  vi.spyOn(window, "getSelection").mockReturnValue({
    isCollapsed: false,
  } as Selection)

  render(<ExpandableText maxLines={2}>{longText}</ExpandableText>)

  fireEvent.click(screen.getByText(longText))

  const control = screen.getByRole("button", { name: "show more" })

  expect(control.getAttribute("aria-expanded")).toBe("false")
})

test("overflowing text expands on click and collapses only through its control", () => {
  mockOverflowingContent()

  render(<ExpandableText maxLines={2}>{longText}</ExpandableText>)

  expect(
    screen.getByRole("button", { name: "show more" }).getAttribute("aria-expanded")
  ).toBe("false")

  fireEvent.click(screen.getByText(longText))
  const control = screen.getByRole("button", { name: "Show less" })
  expect(control.getAttribute("aria-expanded")).toBe("true")

  fireEvent.click(screen.getByText(longText))
  expect(control.getAttribute("aria-expanded")).toBe("true")

  fireEvent.click(control)

  expect(
    screen.getByRole("button", { name: "show more" }).getAttribute(
      "aria-expanded"
    )
  ).toBe("false")
})

test("supports defaultExpanded and custom labels", () => {
  mockOverflowingContent()

  render(
    <ExpandableText defaultExpanded lessLabel="Collapse" moreLabel="expand">
      {longText}
    </ExpandableText>
  )

  const control = screen.getByRole("button", { name: "Collapse" })

  expect(control.getAttribute("aria-expanded")).toBe("true")

  fireEvent.click(control)

  expect(screen.getByRole("button", { name: "expand" })).toBeDefined()
})
