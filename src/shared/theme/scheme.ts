// The page follows the device until a person chooses otherwise, and the
// choice is a class on the root, because `dark:` and `inverted` resolve
// against the nearest theme scope rather than a media query.

export type Theme = "light" | "dark" | "system"

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
