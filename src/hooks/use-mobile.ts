import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  return useIsBelow(MOBILE_BREAKPOINT)
}

/** Whether the viewport is narrower than `width` pixels, kept in step
 *  with the window and right from the first render on the client; false
 *  on the server and in a browser that cannot say. */
export function useIsBelow(width: number) {
  const query = `(max-width: ${width - 1}px)`

  return React.useSyncExternalStore(
    React.useCallback(
      (onChange: () => void) => {
        if (typeof window.matchMedia !== "function") {
          return () => undefined
        }

        const list = window.matchMedia(query)

        list.addEventListener("change", onChange)

        return () => list.removeEventListener("change", onChange)
      },
      [query]
    ),
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia(query).matches,
    () => false
  )
}
