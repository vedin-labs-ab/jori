// The page follows the device until a person chooses otherwise, and the
// choice is a class on the root, because `dark:` and `inverted` resolve
// against the nearest theme scope rather than a media query.

import { Moon, Sun, SunMoon } from "lucide-react"

export type Theme = "light" | "dark" | "system"

export const themeOptions: { icon: typeof Sun; label: string; value: Theme }[] =
  [
    { value: "system", label: "System", icon: SunMoon },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ]

export function themeOption(theme: Theme) {
  return (
    themeOptions.find((option) => option.value === theme) ?? themeOptions[0]
  )
}

export const themeStorageKey = "jori.theme"

export const darkQuery = "(prefers-color-scheme: dark)"

export function resolveTheme(theme: Theme, prefersDark: boolean) {
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme
}

/** Runs before the first paint, so a dark device never sees a light frame.
 *  It repeats `resolveTheme` in browser JavaScript because it cannot import
 *  anything. */
export function themeScript(storageKey: string) {
  return `(function(key){var theme;try{theme=localStorage.getItem(key)}catch(error){}var dark=theme==="dark"||(theme!=="light"&&matchMedia(${JSON.stringify(darkQuery)}).matches);document.documentElement.classList.toggle("dark",dark)})(${JSON.stringify(storageKey)})`
}
