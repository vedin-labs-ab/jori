import { useCallback, useReducer, useState } from "react"
import { type ReferenceTarget } from "../types"
import { isSameTarget } from "./routes"

// The pane's tabs work like an editor's: opening a target previews it in
// an unpinned tab that the next target takes over, and pinning keeps a tab
// through what follows. Replies open their first resource on their own
// until the person closes the pane, which is taken as "not now" for the
// rest of the conversation, or says "open manually" once, which is kept
// for the browser.

export type PaneTab = {
  target: ReferenceTarget
  pinned: boolean
}

/** What the one-time hint was answered with: keep replies opening the
 *  pane, or open resources by hand from now on. */
export type PanePreference = "keep" | "manual"

const storageKey = "jori.chat.pane"

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

type PaneAction =
  | { type: "open"; target: ReferenceTarget; auto: boolean }
  | { type: "activate"; target: ReferenceTarget }
  | { type: "pin"; target: ReferenceTarget }
  | { type: "close"; target: ReferenceTarget }
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

function hasTab(state: PaneState, target: ReferenceTarget) {
  return state.tabs.some((tab) => isSameTarget(tab.target, target))
}

/** The pane's props as `ChatPane` takes them, spread straight in. */
export type PaneProps = {
  active: ReferenceTarget | null
  onActivate: (target: ReferenceTarget) => void
  onClose: (target: ReferenceTarget) => void
  onCloseAll: () => void
  /** Set while the one-time hint should show; answers it. */
  onHint: ((preference: PanePreference) => void) | undefined
  onOpenChange: (open: boolean) => void
  onPin: (target: ReferenceTarget) => void
  open: boolean
  tabs: PaneTab[]
}

/** The pane's tabs and the rules between them. `openTarget` is the
 *  person's — a card clicked, say — and `autoOpen` a reply's, which
 *  yields to a dismissal and to the stored preference. */
export function usePaneTabs(): {
  autoOpen: (target: ReferenceTarget) => void
  openTarget: (target: ReferenceTarget) => void
  pane: PaneProps
} {
  const [state, dispatch] = useReducer(reducePane, initialPaneState)
  const [preference, setPreference] = useState(readPreference)
  const choose = useCallback((next: PanePreference) => {
    writePreference(next)
    setPreference(next)
  }, [])

  return {
    autoOpen: useCallback(
      (target: ReferenceTarget) => {
        if (preference !== "manual") {
          dispatch({ type: "open", target, auto: true })
        }
      },
      [preference]
    ),
    openTarget: useCallback(
      (target: ReferenceTarget) =>
        dispatch({ type: "open", target, auto: false }),
      []
    ),
    pane: {
      active: state.active,
      onActivate: useCallback(
        (target: ReferenceTarget) => dispatch({ type: "activate", target }),
        []
      ),
      onClose: useCallback(
        (target: ReferenceTarget) => dispatch({ type: "close", target }),
        []
      ),
      onCloseAll: useCallback(() => dispatch({ type: "closeAll" }), []),
      onHint: state.autoOpened && preference === undefined ? choose : undefined,
      onOpenChange: useCallback(
        (open: boolean) => dispatch({ type: "setOpen", open }),
        []
      ),
      onPin: useCallback(
        (target: ReferenceTarget) => dispatch({ type: "pin", target }),
        []
      ),
      open: state.open,
      tabs: state.tabs,
    },
  }
}

// The preference lives in the browser; storage can be missing or refuse,
// and either way the pane behaves as if nothing was chosen.

function readPreference(): PanePreference | undefined {
  try {
    const value = window.localStorage.getItem(storageKey)

    return value === "keep" || value === "manual" ? value : undefined
  } catch {
    return undefined
  }
}

function writePreference(preference: PanePreference) {
  try {
    window.localStorage.setItem(storageKey, preference)
  } catch {
    // Nothing to keep it in; the choice holds for this page.
  }
}
