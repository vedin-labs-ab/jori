import { useCallback, useEffect, useRef, useState } from "react"

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

/**
 * The latest `callback` behind one identity, so a memoized child that
 * takes it is not re-rendered by every render of the host that makes it.
 * For handlers only: the identity is stable, the call reaches whatever
 * was passed last.
 */
export function useLatestCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result
) {
  const latest = useRef(callback)

  useEffect(() => {
    latest.current = callback
  })

  return useCallback((...args: Args) => latest.current(...args), [])
}
