// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { Mirror } from "./view"

afterEach(cleanup)

test("the editable file exposes its filename as the editor name", () => {
  render(
    <Mirror mimeType="text/plain" name="notes.txt" value="Meeting notes" />
  )

  const editor = screen.getByRole("textbox", { name: "notes.txt" })
  expect(editor.getAttribute("contenteditable")).toBe("true")
  expect(editor.textContent).toBe("Meeting notes")
})

test("the read-only JSON view keeps a name and read-only semantics", () => {
  render(
    <Mirror
      ariaLabel="Store value JSON"
      mimeType="application/json"
      readOnly
      value='{ "count": 3 }'
    />
  )

  const editor = screen.getByRole("textbox", { name: "Store value JSON" })
  expect(editor.getAttribute("aria-readonly")).toBe("true")
  expect(editor.getAttribute("contenteditable")).toBe("false")
})
