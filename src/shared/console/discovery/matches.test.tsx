// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { Matches } from "./matches"

afterEach(cleanup)
test.each([
  ["Invoice INV-2048", "inv", ["Inv", "INV"]],
  ["[draft] invoice.pdf", "[draft] .pdf", ["[draft]", ".pdf"]],
  ["Årsrapport årsrapport", "års", ["Års", "års"]],
  ["Invoice invoice", "inv invoice", ["Invoice", "invoice"]],
  ["Sales forecast", "revenue", []],
  ["Invoice", "   ", []],
])("literal matching preserves text: %s / %s", (text, query, expected) => {
  const view = render(<Matches text={text} query={query} />)
  expect(view.container.textContent).toBe(text)
  expect(
    [...view.container.querySelectorAll("mark")].map((mark) => mark.textContent)
  ).toEqual(expected)
})

test("untrusted snippets remain text, including HTML and regex characters", () => {
  const text = "<img src=x onerror=alert(1)> .*(danger)"
  const view = render(<Matches text={text} query=".*(danger)" />)
  expect(view.container.textContent).toBe(text)
  expect(view.container.querySelector("img")).toBeNull()
  expect(view.container.querySelector("mark")?.textContent).toBe(".*(danger)")
})
