import { ScriptOnce } from "@tanstack/react-router"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
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

function readTheme(storageKey: string, fallback: Theme): Theme {
  const stored =
    typeof window === "undefined" ? undefined : readStorage(storageKey)

  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : fallback
}

/** Keeps the root's `dark` class current. Nothing offers the choice yet;
 *  the provider is here so a toggle is one control away. */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = themeStorageKey,
}: {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}) {
  const [theme, setThemeState] = useState(() =>
    readTheme(storageKey, defaultTheme)
  )

  useEffect(() => {
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
      writeStorage(storageKey, next)
      setThemeState(next)
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
