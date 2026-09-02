import { type ReactNode, useEffect, useRef, useState } from "react"

/** Children that arrive once their box comes within a screen of the
 *  viewport, so what sits far down the page costs nothing until the reader
 *  heads there. The server and the first client render both show the
 *  fallback, so hydration matches; where nothing can observe (jsdom), the
 *  children render at once. */
export function NearViewport({
  children,
  className,
  fallback,
}: {
  children: ReactNode
  className?: string
  fallback: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isNear, setIsNear] = useState(false)

  useEffect(() => {
    const node = ref.current

    if (node === null || isNear) {
      return
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsNear(true)

      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsNear(true)
        }
      },
      { rootMargin: "100% 0px" }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [isNear])

  return (
    <div className={className} ref={ref}>
      {isNear ? children : fallback}
    </div>
  )
}
