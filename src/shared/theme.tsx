import { ScriptOnce } from "@tanstack/react-router"
import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from "react"
import { readStorage, writeStorage } from "./storage"
import { ThemeContext } from "./theme/context"
import {
  darkQuery,
  resolveTheme,
  type Theme,
  themeScript,
  themeStorageKey,
} from "./theme/scheme"

// The choice is read from storage on every render through an external
// store, so the server renders the default and hydration swaps in the stored
// choice without a mismatch. A choice made while storage refuses writes
// still holds for the page.
let chosen: Theme | undefined
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function readTheme(storageKey: string, fallback: Theme): Theme {
  const stored = chosen ?? readStorage(storageKey)

  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : fallback
}

/** Keeps the root's `dark` class current with the device or the choice. */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = themeStorageKey,
}: {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}) {
  const theme = useSyncExternalStore(
    subscribe,
    () => readTheme(storageKey, defaultTheme),
    () => defaultTheme
  )

  // Before paint, so the hydration render's default never shows through
  // when a stored choice replaces it a moment later.
  useLayoutEffect(() => {
    const media = window.matchMedia(darkQuery)
    const apply = () => {
      document.documentElement.classList.toggle(
        "dark",
        resolveTheme(theme, media.matches) === "dark"
      )
    }

    apply()
    if (theme !== "system") {
      return
    }
    media.addEventListener("change", apply)

    return () => media.removeEventListener("change", apply)
  }, [theme])

  const setTheme = useCallback(
    (next: Theme) => {
      chosen = next
      writeStorage(storageKey, next)
      for (const listener of listeners) {
        listener()
      }
    },
    [storageKey]
  )
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <ThemeContext.Provider value={value}>
      <ScriptOnce>{themeScript(storageKey)}</ScriptOnce>
      {children}
    </ThemeContext.Provider>
  )
}
