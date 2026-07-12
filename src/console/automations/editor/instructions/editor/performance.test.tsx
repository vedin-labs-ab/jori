// @vitest-environment jsdom

import { cleanup, screen, waitFor } from "@testing-library/react"
import { Editor } from "@tiptap/core"
import { afterEach, expect, test, vi } from "vitest"
import { renderInstructionsField } from "../fixtures"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test("keeps editor options stable across controlled field renders", async () => {
  const field = renderInstructionsField({
    description: "Read @Gmail.",
    scope: "personal",
    surfaces: [{ integration: "gmail", tools: ["gmail_search"] }],
  })

  expect(await screen.findByRole("textbox")).toBeDefined()

  const setOptions = vi.spyOn(Editor.prototype, "setOptions")
  field.rerenderScope("organization")

  await waitFor(() => {
    expect(
      field.container.querySelector('[data-automation-surface-scope="blocked"]')
    ).not.toBeNull()
  })
  expect(setOptions).not.toHaveBeenCalled()
})
