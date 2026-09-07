import { type ReferenceTarget } from "../types"
import { isSameTarget } from "./routes"

// The pane's tabs work like an editor's: opening a target previews it in
// an unpinned tab that the next target takes over, and pinning keeps a tab
// through what follows. Replies open their first resource on their own
// until the person closes the pane, which is taken as "not now" for the
// rest of the conversation.

export type PaneTab = {
  target: ReferenceTarget
  pinned: boolean
}

/** Which of a tab's neighbors a close from its menu takes: those on one
 *  side of it, or every other tab. */
export type PaneSide = "left" | "right" | "both"

export type PaneState = {
  tabs: PaneTab[]
  active: ReferenceTarget | null
  open: boolean
  /** The person closed the pane, so replies stop opening it until they
   *  open something themselves. */
  dismissed: boolean
  /** A reply has opened the pane on its own, so the hint has something
   *  to explain. */
  autoOpened: boolean
}

export type PaneAction =
  | { type: "open"; target: ReferenceTarget; auto: boolean }
  | { type: "activate"; target: ReferenceTarget }
  | { type: "pin"; target: ReferenceTarget }
  | { type: "close"; target: ReferenceTarget }
  | { type: "closeBeside"; target: ReferenceTarget; side: PaneSide }
  | { type: "closeAll" }
  | { type: "setOpen"; open: boolean }

export const initialPaneState: PaneState = {
  tabs: [],
  active: null,
  open: false,
  dismissed: false,
  autoOpened: false,
}

export function reducePane(state: PaneState, action: PaneAction): PaneState {
  switch (action.type) {
    case "open":
      return opened(state, action.target, action.auto)
    case "activate":
      return hasTab(state, action.target)
        ? { ...state, active: action.target, open: true }
        : state
    case "pin":
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          isSameTarget(tab.target, action.target)
            ? { ...tab, pinned: !tab.pinned }
            : tab
        ),
      }
    case "close":
      return closed(state, action.target)
    case "closeBeside":
      return closedBeside(state, action.target, action.side)
    case "closeAll":
      return { ...state, tabs: [], active: null, open: false, dismissed: true }
    case "setOpen":
      return action.open
        ? { ...state, open: state.tabs.length > 0 }
        : { ...state, open: false, dismissed: true }
  }
}

/** A target the strip holds comes to the front; a new one takes the
 *  preview tab's place, or joins the strip when every tab is pinned. A
 *  reply's own opening respects a dismissal; the person's lifts it. */
function opened(
  state: PaneState,
  target: ReferenceTarget,
  auto: boolean
): PaneState {
  if (auto && state.dismissed) {
    return state
  }

  return {
    ...state,
    tabs: hasTab(state, target) ? state.tabs : withTarget(state.tabs, target),
    active: target,
    open: true,
    dismissed: auto ? state.dismissed : false,
    autoOpened: state.autoOpened || auto,
  }
}

function withTarget(tabs: PaneTab[], target: ReferenceTarget): PaneTab[] {
  const preview = tabs.findIndex((tab) => !tab.pinned)
  const tab = { target, pinned: false }

  return preview === -1
    ? [...tabs, tab]
    : tabs.map((existing, index) => (index === preview ? tab : existing))
}

/** Closing the active tab moves to the one on its left, or the right
 *  when it was first; closing the last tab closes the pane, without
 *  taking that as a dismissal. */
function closed(state: PaneState, target: ReferenceTarget): PaneState {
  const index = state.tabs.findIndex((tab) => isSameTarget(tab.target, target))

  if (index === -1) {
    return state
  }

  const tabs = state.tabs.filter((_, position) => position !== index)
  const wasActive = state.active !== null && isSameTarget(state.active, target)
  const neighbor = tabs[index - 1] ?? tabs[index]

  return {
    ...state,
    tabs,
    active: wasActive ? (neighbor?.target ?? null) : state.active,
    open: state.open && tabs.length > 0,
  }
}

/** Closing a tab's neighbors keeps the tab and brings it to the front,
 *  since the tab that was active may be among what closed. */
function closedBeside(
  state: PaneState,
  target: ReferenceTarget,
  side: PaneSide
): PaneState {
  const index = state.tabs.findIndex((tab) => isSameTarget(tab.target, target))

  if (index === -1) {
    return state
  }

  const tabs = state.tabs.filter(
    (_, position) =>
      position === index ||
      (side === "left" && position > index) ||
      (side === "right" && position < index)
  )

  return { ...state, tabs, active: target }
}

function hasTab(state: PaneState, target: ReferenceTarget) {
  return state.tabs.some((tab) => isSameTarget(tab.target, target))
}
