import { useEffect } from "react"

/** The shortcut every command palette answers to, spelled for the keys
 *  the person has. */
export const searchShortcut =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘K"
    : "Ctrl K"

/** Cmd/Ctrl+K toggles search from anywhere but a field mid-composition. */
export function useSearchShortcut(onToggle: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "k" &&
        !event.isComposing
      ) {
        event.preventDefault()
        onToggle()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onToggle])
}
