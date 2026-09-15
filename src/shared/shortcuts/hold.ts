import { type RefObject, useEffect, useState } from "react"
import { matchesModifiers, type Shortcut } from "./keys"
import { isShortcutTarget } from "./registry"

type Options = {
  enabled?: boolean
  scope?: RefObject<HTMLElement | null>
  allowInInput?: boolean
}

/** A delayed, non-blocking hint. Never captures focus or consumes a key. */
export function useHeldModifiers(
  { alt, shift, mod }: Omit<Shortcut, "key">,
  { enabled = true, scope, allowInInput = false }: Options = {}
) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    if (!enabled) {
      return
    }
    return watchModifiers({ alt, shift, mod }, setVisible, {
      scope,
      allowInInput,
    })
  }, [alt, shift, mod, enabled, scope, allowInInput])
  return visible
}

function watchModifiers(
  prefix: Omit<Shortcut, "key">,
  show: (visible: boolean) => void,
  { scope, allowInInput }: Options
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const reset = () => {
    clearTimeout(timer)
    timer = undefined
    show(false)
  }
  const keydown = (event: KeyboardEvent) => {
    if (event.repeat) {
      return
    }
    if (
      event.defaultPrevented ||
      event.isComposing ||
      !["Alt", "Shift", "Control", "Meta"].includes(event.key) ||
      !matchesModifiers(event, prefix) ||
      !isShortcutTarget(event.target, scope?.current, allowInInput)
    ) {
      reset()
      return
    }
    if (timer === undefined) {
      timer = setTimeout(() => show(true), 500)
    }
  }
  window.addEventListener("keydown", keydown)
  window.addEventListener("keyup", reset)
  window.addEventListener("blur", reset)
  window.addEventListener("focusin", reset)
  document.addEventListener("visibilitychange", reset)
  return () => {
    clearTimeout(timer)
    window.removeEventListener("keydown", keydown)
    window.removeEventListener("keyup", reset)
    window.removeEventListener("blur", reset)
    window.removeEventListener("focusin", reset)
    document.removeEventListener("visibilitychange", reset)
  }
}
