// @vitest-environment jsdom
import { type Hit } from "@contracts/discovery"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { pageBindings } from "./bindings"
import { SearchPalette } from "./palette"
import { type PaletteProps } from "./types"

afterEach(cleanup)
const hits: Hit[] = Array.from({ length: 6 }, (_, index) => ({
  candidate: {
    key: `files:${index}`,
    revision: "1",
    part: 1,
    score: 6 - index,
  },
  kind: "file",
  resourceId: String(index),
  title: `Report ${index}`,
  resourceName: `Report ${index}`,
  snippet: `Jobs mentioned in report ${index}`,
  location: { kind: "passage", id: String(index), label: "Page 2" },
}))
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
function digit(number: number, altKey = true) {
  fireEvent.keyDown(screen.getByRole("combobox"), {
    key: String(number),
    code: `Digit${number}`,
    altKey,
  })
}

test("only the first five current results get shortcuts, separate from page bindings", () => {
  const initial = props()
  const view = render(<SearchPalette {...initial} />)
  const results = screen.getByRole("group", { name: "Results" })
  const pages = screen.getByRole("group", { name: "Pages" })
  expect(within(results).getAllByRole("option")).toHaveLength(6)
  expect(
    within(pages).getByRole("option").getAttribute("aria-keyshortcuts")
  ).toBe("Alt+Shift+J")
  digit(5)
  expect(initial.onOpenHit).toHaveBeenLastCalledWith(hits[4])
  digit(6)
  digit(1, false)
  expect(initial.onOpenHit).toHaveBeenCalledOnce()
  view.rerender(
    <SearchPalette {...initial} state={{ ...initial.state, hits: [hits[2]] }} />
  )
  digit(1)
  expect(initial.onOpenHit).toHaveBeenLastCalledWith(hits[2])
  view.rerender(
    <SearchPalette
      {...initial}
      state={{ status: "loading", hits: [], partial: false }}
    />
  )
  digit(1)
  expect(initial.onOpenHit).toHaveBeenCalledTimes(2)
})

test("page hints and product-wide bindings agree, including Folders", () => {
  const initial = props()
  render(<SearchPalette {...initial} />)
  fireEvent.keyDown(screen.getByRole("combobox"), {
    key: "J",
    code: "KeyJ",
    altKey: true,
    shiftKey: true,
  })
  expect(initial.onNavigate).toHaveBeenCalledWith({ to: "/jobs" })
  const bindings = pageBindings(initial.onNavigate)
  expect(new Set(bindings.map((binding) => binding.shortcut.key)).size).toBe(
    bindings.length
  )
  bindings.find((binding) => binding.shortcut.key === "o")?.run()
  expect(initial.onNavigate).toHaveBeenLastCalledWith({ to: "/folders" })
})

test("empty, loading, and failure states explain the state and keep retry actionable", () => {
  const initial = props()
  const view = render(
    <SearchPalette
      {...initial}
      query=""
      state={{ status: "idle", hits: [], partial: false }}
    />
  )
  expect(screen.getByText("Search your workspace")).toBeTruthy()
  view.rerender(
    <SearchPalette
      {...initial}
      state={{ status: "loading", hits: [], partial: false }}
    />
  )
  expect(screen.getByRole("combobox").getAttribute("aria-busy")).toBe("true")
  view.rerender(
    <SearchPalette
      {...initial}
      state={{ status: "unavailable", hits: [], partial: true }}
    />
  )
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  expect(initial.onRetry).toHaveBeenCalledOnce()
})

test("a title-only match does not repeat its name on a second row", () => {
  const initial = props()
  render(
    <SearchPalette
      {...initial}
      state={{
        ...initial.state,
        hits: [
          {
            ...hits[0],
            snippet: hits[0].title,
            location: { kind: "resource", id: "0" },
          },
        ],
      }}
    />
  )
  expect(screen.getAllByText(hits[0].title)).toHaveLength(1)
})

test("partial file coverage remains visible alongside a matching excerpt", () => {
  const initial = props()
  render(
    <SearchPalette
      {...initial}
      state={{ ...initial.state, hits: [{ ...hits[0], coverage: "partial" }] }}
    />
  )
  expect(
    screen.getByText("Partial text · Page 2 · Jobs mentioned in report 0")
  ).toBeTruthy()
})
