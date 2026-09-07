import {
  type Dispatch,
  useCallback,
  useMemo,
  useReducer,
  useState,
} from "react"
import { useIsBelow } from "@/hooks/use-mobile"
import { readStorage, writeStorage } from "@/shared/storage"
import { type ReferenceTarget } from "../types"
import {
  initialPaneState,
  type PaneAction,
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

/** Under this width the chat and the pane cannot share the frame — the
 *  chat keeps 384px, the pane 320px, and the sidebar stands inline from
 *  768px — so the pane covers the chat as a sheet instead. */
const paneSheetBreakpoint = 1024

/** Whether the pane is a sheet over the chat rather than a panel beside
 *  it, which is the frame's width to decide. */
export function usePaneSheet() {
  return useIsBelow(paneSheetBreakpoint)
}

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
 *  yields to a dismissal and to the stored preference, and does nothing
 *  while the pane is a sheet: a sheet would cover the reply just read. */
export function usePaneTabs(): {
  autoOpen: (target: ReferenceTarget) => void
  openTarget: OpenTarget
  /** Lets a preview go — a chip deleted, say — and keeps a pinned tab. */
  releaseTarget: (target: ReferenceTarget) => void
  pane: PaneProps
} {
  const [state, dispatch] = useReducer(reducePane, initialPaneState)
  const [preference, setPreference] = useState(readPreference)
  const isSheet = usePaneSheet()
  const choose = useCallback((next: PanePreference) => {
    writePreference(next)
    setPreference(next)
  }, [])

  return {
    autoOpen: useCallback(
      (target: ReferenceTarget) => {
        if (preference !== "manual" && !isSheet) {
          dispatch({ type: "open", target, auto: true })
        }
      },
      [isSheet, preference]
    ),
    openTarget: useCallback<OpenTarget>(
      (target, options) =>
        dispatch({ type: "open", target, auto: false, ...options }),
      []
    ),
    releaseTarget: useCallback(
      (target: ReferenceTarget) => dispatch({ type: "release", target }),
      []
    ),
    pane: {
      ...useTabActions(dispatch),
      active: state.active,
      autoOpens: preference !== "manual",
      onAutoOpens: useCallback(
        (on: boolean) => choose(on ? "keep" : "manual"),
        [choose]
      ),
      onHint: state.autoOpened && preference === undefined ? choose : undefined,
      open: state.open,
      tabs: state.tabs,
    },
  }
}

/** The pane's controls that are the reducer's alone, made once: the
 *  dispatch never changes, so neither do they. */
function useTabActions(dispatch: Dispatch<PaneAction>) {
  return useMemo(
    () => ({
      onActivate: (target: ReferenceTarget) =>
        dispatch({ type: "activate", target }),
      onClose: (target: ReferenceTarget) => dispatch({ type: "close", target }),
      onCloseAll: () => dispatch({ type: "closeAll" }),
      onCloseBeside: (target: ReferenceTarget, side: PaneSide) =>
        dispatch({ type: "closeBeside", target, side }),
      onOpenChange: (open: boolean) => dispatch({ type: "setOpen", open }),
      onPin: (target: ReferenceTarget) => dispatch({ type: "pin", target }),
    }),
    [dispatch]
  )
}

function readPreference(): PanePreference | undefined {
  const value = readStorage(storageKey)

  return value === "keep" || value === "manual" ? value : undefined
}

function writePreference(preference: PanePreference) {
  writeStorage(storageKey, preference)
}
