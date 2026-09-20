import { type ReferenceTarget } from "@contracts/replies/references"
import { expect, test } from "vitest"

import { initialPaneState, type PaneState, reducePane } from "./state"

const table: ReferenceTarget = { kind: "table", id: "t1" }
const job: ReferenceTarget = { kind: "job", id: "j1" }
const file: ReferenceTarget = { kind: "file", id: "f1" }

/** Runs the actions in order from the empty pane. */
function after(...actions: Parameters<typeof reducePane>[1][]): PaneState {
  return actions.reduce(reducePane, initialPaneState)
}

const open = (target: ReferenceTarget, auto = false) =>
  ({ type: "open", target, auto }) as const

/** Three tabs, the first two pinned, the last active. */
const three = () =>
  after(
    open(table),
    { type: "pin", target: table },
    open(job),
    { type: "pin", target: job },
    open(file)
  )

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

test("an opening that keeps pins the tab it makes, or the one it finds", () => {
  const made = after(open(table), { ...open(job), pinned: true })

  expect(made.tabs).toEqual([{ target: job, pinned: true }])

  const found = after(open(table), { ...open(table), pinned: true }, open(job))

  expect(found.tabs).toEqual([
    { target: table, pinned: true },
    { target: job, pinned: false },
  ])
})

test("a release closes a preview and leaves a pinned tab", () => {
  const preview = after(open(table), { type: "release", target: table })

  expect(preview.tabs).toEqual([])
  expect(preview.open).toBe(false)

  const kept = after(
    open(table),
    { type: "pin", target: table },
    { type: "release", target: table }
  )

  expect(kept.tabs).toEqual([{ target: table, pinned: true }])
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
  const closedLast = reducePane(three(), { type: "close", target: file })

  expect(closedLast.active).toEqual(job)
  expect(closedLast.tabs).toHaveLength(2)

  const closedFirst = reducePane(
    { ...three(), active: table },
    { type: "close", target: table }
  )

  expect(closedFirst.active).toEqual(job)

  const closedOther = reducePane(three(), { type: "close", target: table })

  expect(closedOther.active).toEqual(file)
})

test("closing to one side, or the others, keeps the tab and makes it active", () => {
  const targets = (state: PaneState) => state.tabs.map((tab) => tab.target)
  const left = reducePane(three(), {
    type: "closeBeside",
    target: job,
    side: "left",
  })

  expect(targets(left)).toEqual([job, file])
  expect(left.active).toEqual(job)

  const right = reducePane(three(), {
    type: "closeBeside",
    target: job,
    side: "right",
  })

  expect(targets(right)).toEqual([table, job])
  expect(right.active).toEqual(job)

  const others = reducePane(three(), {
    type: "closeBeside",
    target: job,
    side: "both",
  })

  expect(targets(others)).toEqual([job])
  expect(others.active).toEqual(job)
  expect(others.open).toBe(true)

  // A tab the strip lacks closes nothing.
  const same = three()

  expect(
    reducePane(same, {
      type: "closeBeside",
      target: { kind: "store", id: "s1" },
      side: "both",
    })
  ).toBe(same)
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
