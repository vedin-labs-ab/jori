import { useCallback, useReducer, useState } from "react"
import { readStorage, writeStorage } from "@/shared/storage"
import { type ReferenceTarget } from "../types"
import {
  initialPaneState,
  type PaneSide,
  type PaneTab,
  reducePane,
} from "./state"

// Replies open their first resource on their own until the person says
// "open manually" once, which is kept for the browser. The rules between
// the tabs themselves are the reducer's.

/** What the one-time hint was answered with: keep replies opening the
 *  pane, or open resources by hand from now on. */
export type PanePreference = "keep" | "manual"

const storageKey = "jori.chat.pane"

/** The pane's props as `ChatPane` takes them, spread straight in. */
export type PaneProps = {
  active: ReferenceTarget | null
  onActivate: (target: ReferenceTarget) => void
  onClose: (target: ReferenceTarget) => void
  onCloseAll: () => void
  onCloseBeside: (target: ReferenceTarget, side: PaneSide) => void
  /** Whether a reply's first resource opens the pane on its own; the
   *  one-time hint sets it, and the tab menu changes it later. */
  autoOpens: boolean
  /** Set while the one-time hint should show; answers it. */
  onHint: ((preference: PanePreference) => void) | undefined
  onAutoOpens: (on: boolean) => void
  onOpenChange: (open: boolean) => void
  onPin: (target: ReferenceTarget) => void
  open: boolean
  tabs: PaneTab[]
}

/** How the person opens a target: a click previews it, a double click
 *  keeps it. */
export type OpenTarget = (
  target: ReferenceTarget,
  options?: { pinned: boolean }
) => void

/** The pane's tabs and the rules between them. `openTarget` is the
 *  person's — a card clicked, say — and `autoOpen` a reply's, which
 *  yields to a dismissal and to the stored preference. */
export function usePaneTabs(): {
  autoOpen: (target: ReferenceTarget) => void
  openTarget: OpenTarget
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
    openTarget: useCallback<OpenTarget>(
      (target, options) =>
        dispatch({ type: "open", target, auto: false, ...options }),
      []
    ),
    pane: {
      active: state.active,
      autoOpens: preference !== "manual",
      onActivate: useCallback(
        (target: ReferenceTarget) => dispatch({ type: "activate", target }),
        []
      ),
      onClose: useCallback(
        (target: ReferenceTarget) => dispatch({ type: "close", target }),
        []
      ),
      onCloseAll: useCallback(() => dispatch({ type: "closeAll" }), []),
      onCloseBeside: useCallback(
        (target: ReferenceTarget, side: PaneSide) =>
          dispatch({ type: "closeBeside", target, side }),
        []
      ),
      onAutoOpens: useCallback(
        (on: boolean) => choose(on ? "keep" : "manual"),
        [choose]
      ),
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

function readPreference(): PanePreference | undefined {
  const value = readStorage(storageKey)

  return value === "keep" || value === "manual" ? value : undefined
}

function writePreference(preference: PanePreference) {
  writeStorage(storageKey, preference)
}
