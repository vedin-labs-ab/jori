import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { ConsoleFiltersContext } from "./context"

/** Holds the panel's open state for every page under a frame. Given a
 *  storage key it remembers the choice in localStorage; the first render
 *  is always closed, so it matches the server, and storage is read in an
 *  effect. Storage can be unavailable, so every access is guarded. */
export function ConsoleFiltersProvider({
  children,
  storageKey,
}: {
  children: ReactNode
  storageKey?: string
}) {
  const [open, setOpenState] = useState(false)

  useEffect(() => {
    if (storageKey !== undefined) {
      setOpenState(readStoredOpen(storageKey))
    }
  }, [storageKey])

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next)

      if (storageKey !== undefined) {
        writeStoredOpen(storageKey, next)
      }
    },
    [storageKey]
  )
  const value = useMemo(() => ({ open, setOpen }), [open, setOpen])

  return (
    <ConsoleFiltersContext.Provider value={value}>
      {children}
    </ConsoleFiltersContext.Provider>
  )
}

function readStoredOpen(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === "true"
  } catch {
    return false
  }
}

function writeStoredOpen(storageKey: string, open: boolean) {
  try {
    window.localStorage.setItem(storageKey, String(open))
  } catch {
    // Storage that refuses a write only loses the preference.
  }
}
