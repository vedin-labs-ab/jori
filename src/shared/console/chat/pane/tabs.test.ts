// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, expect, test } from "vitest"
import { type ReferenceTarget } from "../types"
import {
  initialPaneState,
  type PaneState,
  reducePane,
  usePaneTabs,
} from "./tabs"

const table: ReferenceTarget = { kind: "table", id: "t1" }
const job: ReferenceTarget = { kind: "job", id: "j1" }
const file: ReferenceTarget = { kind: "file", id: "f1" }

beforeEach(() => {
  window.localStorage.clear()
})

/** Runs the actions in order from the empty pane. */
function after(...actions: Parameters<typeof reducePane>[1][]): PaneState {
  return actions.reduce(reducePane, initialPaneState)
}

const open = (target: ReferenceTarget, auto = false) =>
  ({ type: "open", target, auto }) as const

test("the first target opens as a preview, and the next takes its place", () => {
  const state = after(open(table), open(job))

  expect(state.tabs).toEqual([{ target: job, pinned: false }])
  expect(state.active).toEqual(job)
  expect(state.open).toBe(true)
})

test("a pinned tab stays, so the next target joins beside it", () => {
  const state = after(
    open(table),
    { type: "pin", target: table },
    open(job),
    open(file)
  )

  expect(state.tabs).toEqual([
    { target: table, pinned: true },
    { target: file, pinned: false },
  ])
  expect(state.active).toEqual(file)
})

test("opening a target already in the strip brings it to the front", () => {
  const state = after(
    open(table),
    { type: "pin", target: table },
    open(job),
    open(table)
  )

  expect(state.tabs).toHaveLength(2)
  expect(state.active).toEqual(table)
})

test("pinning toggles, and activating a tab the strip lacks does nothing", () => {
  const pinned = after(open(table), { type: "pin", target: table })

  expect(pinned.tabs[0]?.pinned).toBe(true)
  expect(
    reducePane(pinned, { type: "pin", target: table }).tabs[0]?.pinned
  ).toBe(false)
  expect(reducePane(pinned, { type: "activate", target: job })).toBe(pinned)

  const two = reducePane(pinned, open(job))

  expect(reducePane(two, { type: "activate", target: table }).active).toEqual(
    table
  )
})

test("closing the active tab moves to its left neighbor, or the right when first", () => {
  const three = after(
    open(table),
    { type: "pin", target: table },
    open(job),
    { type: "pin", target: job },
    open(file)
  )

  const closedLast = reducePane(three, { type: "close", target: file })

  expect(closedLast.active).toEqual(job)
  expect(closedLast.tabs).toHaveLength(2)

  const closedFirst = reducePane(
    { ...three, active: table },
    { type: "close", target: table }
  )

  expect(closedFirst.active).toEqual(job)

  const closedOther = reducePane(three, { type: "close", target: table })

  expect(closedOther.active).toEqual(file)
})

test("closing the last tab closes the pane without dismissing it", () => {
  const state = after(open(table), { type: "close", target: table })

  expect(state).toMatchObject({ tabs: [], active: null, open: false })
  expect(state.dismissed).toBe(false)
})

test("closing the pane, or everything in it, is a dismissal replies respect", () => {
  const hidden = after(open(table), { type: "setOpen", open: false })

  expect(hidden.dismissed).toBe(true)
  expect(hidden.tabs).toHaveLength(1)
  expect(reducePane(hidden, open(job, true))).toBe(hidden)

  const cleared = after(open(table), { type: "closeAll" })

  expect(cleared).toMatchObject({ tabs: [], open: false, dismissed: true })

  // The person opening something themselves lifts it.
  const lifted = reducePane(hidden, open(job))

  expect(lifted).toMatchObject({ open: true, dismissed: false })
  expect(reducePane(lifted, open(file, true)).active).toEqual(file)
})

test("a reply's opening marks the pane as auto-opened; reopening needs a tab", () => {
  expect(after(open(table, true)).autoOpened).toBe(true)
  expect(after(open(table)).autoOpened).toBe(false)
  expect(after({ type: "setOpen", open: true }).open).toBe(false)
})

test("the hint shows after a reply opens the pane, until it is answered", () => {
  const { result } = renderHook(() => usePaneTabs())

  expect(result.current.pane.onHint).toBeUndefined()

  act(() => result.current.autoOpen(table))

  expect(result.current.pane.tabs).toHaveLength(1)
  expect(result.current.pane.onHint).toBeDefined()

  act(() => result.current.pane.onHint?.("keep"))

  expect(result.current.pane.onHint).toBeUndefined()
  expect(window.localStorage.getItem("jori.chat.pane")).toBe("keep")

  act(() => result.current.autoOpen(job))

  expect(result.current.pane.active).toEqual(job)
})

test("choosing to open manually stops replies opening the pane, for the browser", () => {
  const first = renderHook(() => usePaneTabs())

  act(() => first.result.current.autoOpen(table))
  act(() => first.result.current.pane.onHint?.("manual"))

  expect(window.localStorage.getItem("jori.chat.pane")).toBe("manual")

  act(() => first.result.current.autoOpen(job))

  expect(first.result.current.pane.active).toEqual(table)

  first.unmount()

  const next = renderHook(() => usePaneTabs())

  act(() => next.result.current.autoOpen(job))

  expect(next.result.current.pane.tabs).toHaveLength(0)
  expect(next.result.current.pane.onHint).toBeUndefined()

  // The person's own opening is never stopped.
  act(() => next.result.current.openTarget(job))

  expect(next.result.current.pane.open).toBe(true)
})
