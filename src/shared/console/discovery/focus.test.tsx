// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { SearchPalette } from "./palette"
import { type PaletteProps } from "./types"

const hits: PaletteProps["state"]["hits"] = [
  {
    candidate: { key: "files:1", revision: "1", part: 1, score: 1 },
    kind: "file",
    resourceId: "1",
    title: "Report",
    resourceName: "Report",
    snippet: "Jobs report",
    location: { kind: "resource", id: "1" },
  },
]
function props(): PaletteProps {
  return {
    chats: [],
    open: true,
    query: "jobs",
    state: { status: "ready", hits, partial: false },
    onQueryChange: vi.fn(),
    onOpenChange: vi.fn(),
    onOpenHit: vi.fn(),
    onNavigate: vi.fn(),
    onRetry: vi.fn(),
  }
}
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

test.each(["button", "input"])(
  "dismissing search returns focus to the %s that opened it",
  (control) => {
    vi.useFakeTimers()
    const initial = props()
    const content = (open: boolean) => (
      <>
        {control === "button" ? (
          <button type="button">Search</button>
        ) : (
          <input aria-label="Message draft" />
        )}
        <SearchPalette {...initial} open={open} />
      </>
    )
    const view = render(content(false))
    const origin = screen.getByRole(control === "button" ? "button" : "textbox")
    origin.focus()
    view.rerender(content(true))
    expect(document.activeElement).toBe(screen.getByRole("combobox"))
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
    expect(initial.onOpenChange).toHaveBeenCalledWith(false)
    view.rerender(content(false))
    act(() => vi.runOnlyPendingTimers())
    expect(document.activeElement).toBe(origin)
  }
)

test.each(["page", "result"])(
  "opening a %s preserves focus placed by navigation",
  (destination) => {
    vi.useFakeTimers()
    const initial = props()
    const content = (open: boolean) => (
      <>
        <button type="button">Search</button>
        <h1 tabIndex={-1}>Destination</h1>
        <SearchPalette {...initial} open={open} />
      </>
    )
    const view = render(content(false))
    screen.getByRole("button", { name: "Search" }).focus()
    view.rerender(content(true))
    if (destination === "page") {
      fireEvent.keyDown(screen.getByRole("combobox"), {
        key: "J",
        code: "KeyJ",
        altKey: true,
        shiftKey: true,
      })
      expect(initial.onNavigate).toHaveBeenCalledWith({ to: "/jobs" })
    } else {
      fireEvent.keyDown(screen.getByRole("combobox"), {
        key: "1",
        code: "Digit1",
        altKey: true,
      })
      expect(initial.onOpenHit).toHaveBeenCalledWith(hits[0])
    }
    view.rerender(content(false))
    const heading = screen.getByRole("heading", { name: "Destination" })
    heading.focus()
    act(() => vi.runOnlyPendingTimers())
    expect(document.activeElement).toBe(heading)
  }
)
