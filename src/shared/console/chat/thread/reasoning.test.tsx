// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { ChatReasoning } from "./reasoning"

afterEach(cleanup)

const thinking = "Read the notes.\nCheck the open issues.\nDraft the reply."

test("while thinking, the block shows the text's tail and opens to the whole", () => {
  render(<ChatReasoning settled={false} text={thinking} />)

  const toggle = screen.getByRole("button", { name: "Thinking" })
  const tail = screen.getByText(/Draft the reply/).parentElement

  expect(toggle.getAttribute("aria-expanded")).toBe("false")
  expect(tail?.className).toContain("overflow-hidden")
  expect(tail?.className).toContain("justify-end")

  fireEvent.click(toggle)

  expect(toggle.getAttribute("aria-expanded")).toBe("true")
  expect(
    screen.getByText(/Draft the reply/).parentElement?.className
  ).not.toContain("overflow-hidden")
})

test("once the reply starts, the thinking folds to its line and still opens", () => {
  render(<ChatReasoning settled text={thinking} />)

  expect(screen.queryByText(/Draft the reply/)).toBeNull()

  const toggle = screen.getByRole("button", { name: "Thought" })

  expect(toggle.querySelector(".shimmer")).toBeNull()

  fireEvent.click(toggle)

  expect(screen.getByText(/Draft the reply/)).toBeDefined()
})
