import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react"

/** What the toolbar's save indicator shows. The debounce window stays
 *  quiet ("idle"); the indicator only speaks once a save is in flight. */
import { type SaveState } from "../../shared/materials/save"

/** How long the buffer rests after the last keystroke before it saves. */
const saveDelay = 1200

/** How long a failed save waits before trying again. */
const retryDelay = 3000

/** How long the saved check lingers before the indicator goes quiet. */
const savedLinger = 4000

type Persist = (text: string) => Promise<boolean>

type Timer = ReturnType<typeof setTimeout>

/** The loop's mutable state, held in a ref so timers and in-flight saves
 *  read the newest buffer without re-render churn. `draft` is the unsaved
 *  text; null means the buffer matches the persisted content. */
type Loop = {
  draft: string | null
  isInFlight: boolean
  isMounted: boolean
  lingerTimer: Timer | undefined
  persist: Persist
  saveTimer: Timer | undefined
  setStatus: Dispatch<SetStateAction<SaveState>>
}

/** Debounced autosave: edits schedule a save of the newest buffer, failed
 *  saves keep the buffer and retry on a timer, and `flush` pushes pending
 *  edits out immediately. Unmount and tab close flush best-effort. */
export function useAutosave(persist: Persist) {
  const [status, setStatus] = useState<SaveState>("idle")
  const loopRef = useRef<Loop | null>(null)
  loopRef.current ??= {
    draft: null,
    isInFlight: false,
    isMounted: true,
    lingerTimer: undefined,
    persist,
    saveTimer: undefined,
    setStatus,
  }
  const loop = loopRef.current

  useEffect(() => {
    loop.persist = persist
  }, [loop, persist])

  useEffect(() => {
    loop.isMounted = true
    const flushOnHide = () => flushDetached(loop)
    window.addEventListener("pagehide", flushOnHide)

    return () => {
      window.removeEventListener("pagehide", flushOnHide)
      loop.isMounted = false
      clearTimeout(loop.saveTimer)
      clearTimeout(loop.lingerTimer)
      flushDetached(loop)
    }
  }, [loop])

  return {
    change: (text: string, isClean: boolean) => change(loop, text, isClean),
    flush: () => flush(loop),
    status,
  }
}

/** Records the newest buffer. Clean text (matching the persisted content)
 *  cancels any pending save; dirty text restarts the debounce window. */
function change(loop: Loop, text: string, isClean: boolean) {
  clearTimeout(loop.saveTimer)

  if (isClean && !loop.isInFlight) {
    loop.draft = null
    loop.setStatus("idle")

    return
  }

  loop.draft = text
  loop.saveTimer = setTimeout(() => void run(loop), saveDelay)
  loop.setStatus((current) => (current === "saved" ? "idle" : current))
}

/** Saves pending edits now instead of waiting out the debounce. */
function flush(loop: Loop) {
  clearTimeout(loop.saveTimer)
  void run(loop)
}

async function run(loop: Loop) {
  const text = loop.draft

  if (text === null || loop.isInFlight) {
    return
  }

  loop.isInFlight = true
  loop.setStatus("saving")
  const didSave = await loop.persist(text)
  loop.isInFlight = false
  finish(loop, text, didSave)
}

/** Settles a completed save: retry on failure, follow up on edits made
 *  while the save was in flight, and otherwise let "Saved" linger. */
function finish(loop: Loop, text: string, didSave: boolean) {
  if (!loop.isMounted) {
    finishDetached(loop, text, didSave)

    return
  }

  if (!didSave) {
    loop.setStatus("error")
    loop.saveTimer = setTimeout(() => void run(loop), retryDelay)

    return
  }

  if (loop.draft === text) {
    loop.draft = null
  }

  if (loop.draft !== null) {
    clearTimeout(loop.saveTimer)
    loop.saveTimer = setTimeout(() => void run(loop), saveDelay)

    return
  }

  loop.setStatus("saved")
  clearTimeout(loop.lingerTimer)
  loop.lingerTimer = setTimeout(() => loop.setStatus("idle"), savedLinger)
}

/** After unmount there is no loop left to schedule, so make one last
 *  fire-and-forget attempt with whatever is newest. */
function finishDetached(loop: Loop, text: string, didSave: boolean) {
  if (didSave && loop.draft === text) {
    loop.draft = null

    return
  }

  flushDetached(loop)
}

/** Best-effort save outside the debounce loop: unmount and tab close. */
function flushDetached(loop: Loop) {
  if (loop.draft !== null && !loop.isInFlight) {
    void loop.persist(loop.draft)
  }
}
