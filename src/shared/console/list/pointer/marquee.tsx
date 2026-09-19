import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { type RowSelection } from "../selection"
import { interactiveSelector, rowSelector } from "./targets"

// The box a desktop draws when a press on empty space turns into a drag:
// every row it touches is selected, live, as it sweeps. It starts from the
// list's background or from any cell but the name, which drags the row
// instead, and the list scrolls when the pointer nears its top or bottom.
// A press that never moves is a click: on a row it picks the row, on the
// background it clears the selection.

/** How far a press travels before it is a marquee rather than a click. */
const threshold = 4

/** The band at the list's top and bottom that scrolls it, and the most it
 *  scrolls per frame at the very edge. */
const scrollBand = 40
const scrollSpeed = 18

type Point = { x: number; y: number }

type Sweep = {
  /** The selection the sweep adds to, empty unless ⌘/Ctrl or Shift held. */
  base: ReadonlySet<string>
  /** Whether a press that never moves was a click on the background. */
  clearsOnClick: boolean
  frame: number | undefined
  isActive: boolean
  /** The last selection handed over, so a still pointer asks for nothing. */
  key: string
  pointer: Point
  /** Where the press landed, in the list's scrolled content. */
  start: Point
}

/** Wires a scrolling list for marquee selection. Put `onPointerDown` and
 *  `ref` on the scroll container and render `box` inside it; rows take
 *  part by carrying `data-row-id`. */
export function useMarquee<Row>(selection: RowSelection<Row> | undefined) {
  const container = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const latest = useRef(selection)
  // Built once: its listeners sit on the window across the renders each
  // sweep causes, so they must stay the same functions throughout.
  const marquee = useMemo(
    () =>
      createMarquee({
        box: () => box.current,
        list: () => container.current,
        selection: () => latest.current,
      }),
    []
  )

  useEffect(() => {
    latest.current = selection
  })
  useEffect(() => marquee.finish, [marquee])

  return {
    box: (
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 z-[5] hidden rounded-xs border border-ring/60 bg-ring/15"
        ref={box}
      />
    ),
    onPointerDown: marquee.press,
    ref: container,
  }
}

type Read<Row> = {
  box: () => HTMLElement | null
  list: () => HTMLElement | null
  selection: () => RowSelection<Row> | undefined
}

function createMarquee<Row>(read: Read<Row>) {
  let sweep: Sweep | undefined

  function finish() {
    if (sweep?.frame !== undefined) {
      cancelAnimationFrame(sweep.frame)
    }

    window.removeEventListener("pointermove", onPointerMove)
    window.removeEventListener("pointerup", onPointerUp)
    window.removeEventListener("pointercancel", finish)
    read.box()?.style.setProperty("display", "none")
    read.list()?.style.removeProperty("user-select")
    sweep = undefined
  }

  function onPointerMove(event: PointerEvent) {
    const list = read.list()

    if (sweep === undefined || list === null) {
      return
    }

    sweep.pointer = { x: event.clientX, y: event.clientY }

    if (!sweep.isActive) {
      if (distance(sweep.pointer, toViewport(list, sweep.start)) < threshold) {
        return
      }

      sweep.isActive = true
      list.style.setProperty("user-select", "none")
      window.getSelection()?.removeAllRanges()
      swallowNextClick()
      sweep.frame = requestAnimationFrame(tick)
    }

    draw(read, sweep)
  }

  function onPointerUp() {
    if (sweep !== undefined && !sweep.isActive && sweep.clearsOnClick) {
      read.selection()?.replace([])
    }

    finish()
  }

  /** Scrolls while the pointer rests in an edge band, redrawing as the
   *  rows move under a still pointer. */
  function tick() {
    const list = read.list()

    if (sweep === undefined || list === null) {
      return
    }

    const step = scrollStep(list, sweep.pointer)

    if (step !== 0) {
      list.scrollTop += step
      draw(read, sweep)
    }

    sweep.frame = requestAnimationFrame(tick)
  }

  return {
    finish,
    press: (event: ReactPointerEvent<HTMLElement>) => {
      const list = read.list()
      const selection = read.selection()

      if (list === null || selection === undefined || !startsSweep(event)) {
        return
      }

      finish()
      sweep = pressed(list, selection, event)
      window.addEventListener("pointermove", onPointerMove)
      window.addEventListener("pointerup", onPointerUp)
      window.addEventListener("pointercancel", finish)
    },
  }
}

/** A primary mouse or pen press on the list itself: not on a control, the
 *  name a drag moves the row by, or the header. Touch scrolls instead. */
function startsSweep(event: ReactPointerEvent<HTMLElement>) {
  return (
    event.button === 0 &&
    event.pointerType !== "touch" &&
    event.target instanceof Element &&
    event.currentTarget.contains(event.target) &&
    event.target.closest(`${interactiveSelector},thead`) === null
  )
}

function pressed<Row>(
  list: HTMLElement,
  selection: RowSelection<Row>,
  event: ReactPointerEvent<HTMLElement>
): Sweep {
  const isAdding = event.shiftKey || event.metaKey || event.ctrlKey
  const pointer = { x: event.clientX, y: event.clientY }

  return {
    base: new Set(isAdding ? selection.selected.map(selection.identify) : []),
    // A press on a row leaves its click to pick the row.
    clearsOnClick:
      !isAdding && (event.target as Element).closest(rowSelector) === null,
    frame: undefined,
    isActive: false,
    key: "unswept",
    pointer,
    start: toContent(list, pointer),
  }
}

/** Sizes the box from the press to the pointer and selects what it
 *  touches, on top of what the sweep started with. */
function draw<Row>(read: Read<Row>, sweep: Sweep) {
  const list = read.list()
  const element = read.box()

  if (list === null || element === null) {
    return
  }

  const end = toContent(list, clamp(list, sweep.pointer))
  const top = Math.min(sweep.start.y, end.y)
  const bottom = Math.max(sweep.start.y, end.y)

  element.style.display = "block"
  element.style.transform = `translate(${Math.min(sweep.start.x, end.x)}px, ${top}px)`
  element.style.width = `${Math.abs(sweep.start.x - end.x)}px`
  element.style.height = `${bottom - top}px`

  const ids = new Set(sweep.base)

  for (const row of list.querySelectorAll<HTMLElement>(rowSelector)) {
    const bounds = row.getBoundingClientRect()
    const rowTop = toContent(list, { x: bounds.left, y: bounds.top }).y

    if (rowTop < bottom && rowTop + bounds.height > top) {
      ids.add(row.dataset.rowId ?? "")
    }
  }

  const key = [...ids].sort().join("\n")

  if (key !== sweep.key) {
    sweep.key = key
    read.selection()?.replace(ids)
  }
}

/** How far to scroll this frame: faster the deeper the pointer sits in an
 *  edge band, and not at all outside them. */
function scrollStep(list: HTMLElement, pointer: Point) {
  const bounds = list.getBoundingClientRect()
  const above = bounds.top + headerHeight(list) + scrollBand - pointer.y
  const below = pointer.y - (bounds.bottom - scrollBand)
  const push = Math.max(above, below)

  if (push <= 0) {
    return 0
  }

  const step = Math.ceil(scrollSpeed * Math.min(push / scrollBand, 1))

  return above > below ? -step : step
}

function distance(from: Point, to: Point) {
  return Math.hypot(from.x - to.x, from.y - to.y)
}

/** The sticky header covers the top of the scrollport, so the band that
 *  scrolls up starts beneath it. */
function headerHeight(list: HTMLElement) {
  return list.querySelector("thead")?.getBoundingClientRect().height ?? 0
}

function toContent(list: HTMLElement, point: Point): Point {
  const bounds = list.getBoundingClientRect()

  return {
    x: point.x - bounds.left + list.scrollLeft,
    y: point.y - bounds.top + list.scrollTop,
  }
}

function toViewport(list: HTMLElement, point: Point): Point {
  const bounds = list.getBoundingClientRect()

  return {
    x: point.x + bounds.left - list.scrollLeft,
    y: point.y + bounds.top - list.scrollTop,
  }
}

/** Holds the box this far inside the list: the main view clips to rounded
 *  corners, and a square corner pushed into one would lose its border. */
const edgeInset = 4

function clamp(list: HTMLElement, point: Point): Point {
  const bounds = list.getBoundingClientRect()

  return {
    x: Math.min(
      Math.max(point.x, bounds.left + edgeInset),
      bounds.right - edgeInset
    ),
    y: Math.min(
      Math.max(point.y, bounds.top + edgeInset),
      bounds.bottom - edgeInset
    ),
  }
}

/** The click a browser fires after the release would pick the row under
 *  it, or clear what the sweep just selected. */
function swallowNextClick() {
  const swallow = (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
  }

  window.addEventListener("click", swallow, { capture: true, once: true })
  window.addEventListener(
    "pointerup",
    () =>
      setTimeout(
        () => window.removeEventListener("click", swallow, { capture: true }),
        0
      ),
    { once: true }
  )
}
