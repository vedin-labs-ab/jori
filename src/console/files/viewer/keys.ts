import { type RefObject, useEffect } from "react"

/** Space toggles play/pause for the previewed audio or video — the player
 *  convention people arrive with — while typing surfaces and the focused
 *  native controls (which already own the key) stay untouched. Enter stays
 *  unbound: it activates whatever control has focus. */
export function useMediaKeys(media: RefObject<HTMLMediaElement | null>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const element = media.current

      if (element === null || !allowsPlayToggle(event)) {
        return
      }

      event.preventDefault()

      if (element.paused) {
        void element.play().catch(() => undefined)
      } else {
        element.pause()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [media])
}

/** Whether a keydown should toggle playback: plain Space, not already
 *  handled, and not aimed at a control that owns the key itself. */
export function allowsPlayToggle(event: {
  altKey: boolean
  ctrlKey: boolean
  defaultPrevented: boolean
  key: string
  metaKey: boolean
  target: EventTarget | null
}) {
  if (
    event.key !== " " ||
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey
  ) {
    return false
  }

  const target = event.target

  return !(
    target instanceof HTMLElement &&
    target.closest(
      "input, textarea, select, button, audio, video, [contenteditable=true]"
    ) !== null
  )
}
