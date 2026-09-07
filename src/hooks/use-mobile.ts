import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  return useIsBelow(MOBILE_BREAKPOINT)
}

/** Whether the viewport is narrower than `width` pixels, kept in step
 *  with the window; false until the browser has answered. */
export function useIsBelow(width: number) {
  const [isBelow, setIsBelow] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return
    }

    const mql = window.matchMedia(`(max-width: ${width - 1}px)`)
    const onChange = (event: MediaQueryListEvent) => {
      setIsBelow(event.matches)
    }
    mql.addEventListener("change", onChange)
    setIsBelow(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [width])

  return !!isBelow
}
