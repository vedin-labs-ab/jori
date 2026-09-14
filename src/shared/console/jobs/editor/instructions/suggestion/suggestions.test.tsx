// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { InstructionSuggestions } from "./suggestions"

afterEach(cleanup)

test("describes only suggestions that add access with the shared hint", () => {
  render(
    <InstructionSuggestions
      listboxId="tool-suggestions"
      onActiveIndexChange={vi.fn()}
      onDismiss={vi.fn()}
      onSelect={vi.fn()}
      state={{
        active: { end: 1, kind: "tool", query: "", start: 0 },
        activeIndex: 0,
        empty: "empty",
        range: { from: 0, to: 1 },
        anchor: {
          contextElement: document.body,
          getBoundingClientRect: () => new DOMRect(),
        },
        side: "bottom",
        suggestions: [
          {
            access: { kind: "builtIn" },
            disabled: false,
            id: "save_file",
            kind: "tool",
            label: "save_file",
            surface: "jori",
          },
          {
            access: { integration: "slack", kind: "integration" },
            disabled: false,
            id: "conversations_add_message",
            kind: "tool",
            label: "conversations_add_message",
            surface: "slack",
          },
        ],
      }}
    />
  )

  const listbox = screen.getByRole("listbox")
  const footer = screen.getByText(
    "Selecting a tool can add the access it needs."
  )
  const builtIn = screen.getByRole("option", { name: "save_file" })
  const needsAccess = screen.getByRole("option", {
    name: "conversations_add_message",
  })

  expect(listbox.contains(footer)).toBe(false)
  expect(builtIn.getAttribute("aria-describedby")).toBeNull()
  expect(needsAccess.getAttribute("aria-describedby")).toBe(footer.id)
  expect(screen.queryByText("Built in")).toBeNull()
  expect(screen.queryByText("+ Slack access")).toBeNull()
})
