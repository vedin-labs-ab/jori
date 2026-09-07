import { useEffect, useState } from "react"

/** How far the shown text may trail the target: about a sentence. */
const maxLag = 120
/** The share of the backlog one step reveals, and the least it reveals. */
const catchUpShare = 15
const minStep = 4

/**
 * The target text, revealed a few characters every other animation frame
 * so that a burst of writes reads as typing rather than as jumps. Each
 * step shows max(4, ⌈backlog / 15⌉) more characters, so the pace rises
 * with the backlog and a sentence drains in about half a second; anything
 * further behind than a sentence shows at once. A step every other frame
 * halves what the markdown has to lay out for the same pace. What is
 * there on the first render shows whole, a target that is not a
 * continuation restarts, and a reader who asked for reduced motion sees
 * the target as it is.
 */
export function useRevealedText(target: string) {
  const [shown, setShown] = useState(target)
  const reduced = prefersReducedMotion()
  const current = target.startsWith(shown) ? shown : ""

  useEffect(() => {
    if (reduced || current === target) {
      return
    }

    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setShown(advance(current, target)))
    })

    return () => cancelAnimationFrame(frame)
  }, [current, reduced, target])

  return reduced ? target : current
}

/** One step's worth more of the target. */
export function advance(shown: string, target: string) {
  const start = Math.max(shown.length, target.length - maxLag)
  const backlog = target.length - start
  const step = Math.max(minStep, Math.ceil(backlog / catchUpShare))

  return target.slice(0, start + step)
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}
