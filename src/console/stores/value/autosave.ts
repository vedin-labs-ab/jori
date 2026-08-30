import { useEffect, useRef, useState } from "react"

// Debounced autosave for the store value editor, mirroring the file
// editor's rhythm: edits schedule a save, validation gates every write,
// and the toolbar meta carries the status instead of explicit buttons.

export type ValueSaveStatus = "idle" | "saving" | "saved" | "error"

/** What one save attempt came to. Invalid drafts surface their inline
 *  errors and simply don't write; conflicts toast and reseed upstream. */
export type ValueSaveOutcome = "saved" | "invalid" | "conflict"

const debounceMs = 1200
const savedLinger = 4000
const retryMs = 3000

type Timer = ReturnType<typeof setTimeout>

type Loop = {
  inFlight: boolean
  pending: boolean
  timer: Timer | undefined
  lingerTimer: Timer | undefined
}

/** Drives the debounced save loop. `perform` is read through a ref so the
 *  latest editor state is always the one validated and written. */
export function useValueAutosave(perform: () => Promise<ValueSaveOutcome>) {
  const [status, setStatus] = useState<ValueSaveStatus>("idle")
  const performRef = useRef(perform)
  const loopRef = useRef<Loop>({
    inFlight: false,
    pending: false,
    timer: undefined,
    lingerTimer: undefined,
  })

  performRef.current = perform

  useEffect(() => {
    const loop = loopRef.current

    return () => {
      clearTimeout(loop.timer)
      clearTimeout(loop.lingerTimer)
    }
  }, [])

  function schedule(delay: number) {
    const loop = loopRef.current

    clearTimeout(loop.timer)
    loop.timer = setTimeout(() => void run(), delay)
  }

  async function run() {
    const loop = loopRef.current

    if (loop.inFlight) {
      return
    }

    clearTimeout(loop.timer)
    loop.timer = undefined
    loop.inFlight = true
    loop.pending = false
    clearTimeout(loop.lingerTimer)
    setStatus("saving")

    try {
      const outcome = await performRef.current()

      if (outcome === "saved") {
        setStatus("saved")
        loop.lingerTimer = setTimeout(() => {
          setStatus((current) => (current === "saved" ? "idle" : current))
        }, savedLinger)
      } else {
        setStatus("idle")
      }
    } catch {
      setStatus("error")
      schedule(retryMs)
    } finally {
      loop.inFlight = false

      if (loop.pending) {
        schedule(debounceMs)
      }
    }
  }

  return {
    status,
    change() {
      loopRef.current.pending = true
      schedule(debounceMs)
    },
    isBusy() {
      const loop = loopRef.current

      return loop.inFlight || loop.pending || loop.timer !== undefined
    },
  }
}
