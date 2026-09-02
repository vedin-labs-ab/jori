import { useEffect, useRef, useState } from "react"

/**
 * Keeps the last defined value so dialog content survives the close
 * animation: deriving both `open` and the content from one piece of
 * state paints an empty frame while the dialog animates out.
 */
export function useRetained<Value>(value: Value | undefined) {
  const last = useRef(value)

  if (value !== undefined) {
    last.current = value
  }

  return value ?? last.current
}

/**
 * Keeps a dialog mounted from its first open onwards, so a lazily loaded
 * dialog stays out of the page's chunk without losing its close animation.
 */
export function useRetainedMount(isOpen: boolean) {
  const [hasOpened, setHasOpened] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setHasOpened(true)
    }
  }, [isOpen])

  return isOpen || hasOpened
}

/**
 * An onOpenChange handler for a dialog whose host owns the open state:
 * opening never arrives here, so only a dismissal has anything to do.
 */
export function closeOnDismiss(close: () => void) {
  return (open: boolean) => {
    if (!open) {
      close()
    }
  }
}
