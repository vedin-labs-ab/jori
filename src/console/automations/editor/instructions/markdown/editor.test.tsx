// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { renderInstructionsField } from "../fixtures"

afterEach(cleanup)

test("renders the supported Markdown hierarchy", async () => {
  const field = renderInstructionsField({
    description: [
      "# Daily brief",
      "",
      "Use **clear** and *concise* prose.",
      "",
      "- First",
      "- Second",
      "",
      "> Keep the source link.",
    ].join("\n"),
    surfaces: [],
  })

  expect(await screen.findByRole("textbox")).toBeDefined()
  expect(field.container.querySelector("h1")?.textContent).toBe("Daily brief")
  expect(field.container.querySelector("strong")?.textContent).toBe("clear")
  expect(field.container.querySelector("em")?.textContent).toBe("concise")
  expect(field.container.querySelectorAll("li")).toHaveLength(2)
  expect(field.container.querySelector("blockquote")).not.toBeNull()
})

test("highlights JSON without guessing unknown languages", async () => {
  const field = renderInstructionsField({
    description: [
      "```json",
      '{"enabled": true}',
      "```",
      "",
      "```jsoon",
      '{"plain": true}',
      "```",
    ].join("\n"),
    surfaces: [],
  })

  expect(await screen.findByRole("textbox")).toBeDefined()
  const blocks = field.container.querySelectorAll("pre")

  expect(blocks).toHaveLength(2)
  expect(blocks[0].querySelector(".hljs-attr")).not.toBeNull()
  expect(blocks[1].querySelector("[class^='hljs-']")).toBeNull()
})

test("allows pills in plain fences but not programming fences", async () => {
  const field = renderInstructionsField({
    description: [
      "```text",
      "Use #conversations_add_message.",
      "```",
      "",
      "```json",
      '{"tool":"#conversations_add_message"}',
      "```",
    ].join("\n"),
    surfaces: [],
  })

  expect(await screen.findByRole("textbox")).toBeDefined()
  expect(
    field.container.querySelectorAll('[data-automation-reference-kind="tool"]')
  ).toHaveLength(1)
  expect(
    field.container.querySelector("pre[data-instruction-text]")
  ).not.toBeNull()
})

test("shows raw HTML and images as text without creating DOM elements", async () => {
  renderInstructionsField({
    description: [
      '<img src="https://example.com/tracker.png" alt="#conversations_add_message">',
      "",
      "![Preview](https://example.com/image.png)",
    ].join("\n"),
    surfaces: [],
  })

  const editor = await screen.findByRole("textbox")

  expect(editor.querySelector("img")).toBeNull()
  expect(editor.textContent).toContain("<img src=")
  expect(editor.textContent).toContain("![Preview]")
  expect(
    editor.querySelector('[data-automation-reference-kind="tool"]')
  ).toBeNull()
})
