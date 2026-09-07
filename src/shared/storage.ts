import { useCallback, useState } from "react"

// The browser's storage holds the small choices a person makes about the
// console — a pane preference, a closed sidebar group — and can be
// missing or refuse: a private window, cleared site data, a browser set
// to block it. Either way the console behaves as if nothing was chosen.

export function readStorage(key: string): string | undefined {
  try {
    return window.localStorage.getItem(key) ?? undefined
  } catch {
    return undefined
  }
}

export function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage that refuses a write only loses the preference.
  }
}

/** An open-or-closed choice the browser remembers under `key`: open
 *  unless it was closed. */
export function useStoredOpen(key: string) {
  const [open, setOpen] = useState(() => readStorage(key) !== "closed")

  return [
    open,
    useCallback(
      (next: boolean) => {
        writeStorage(key, next ? "open" : "closed")
        setOpen(next)
      },
      [key]
    ),
  ] as const
}
