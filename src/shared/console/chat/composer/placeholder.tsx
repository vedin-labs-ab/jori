import { useEffect, useState } from "react"

// The composer's placeholder types the asks the home did not show, one
// after another, the way a search box hints at what it can find: a few
// characters a tick, a pause to read, then back to nothing and the next.
// A person who prefers less motion, or a browser that cannot say, sees
// the plain prompt.

const typeInterval = 40
const holdInterval = 2_400
const deleteInterval = 18
const restInterval = 500

type Phase = "typing" | "holding" | "deleting" | "resting"

type Typed = {
  index: number
  length: number
  phase: Phase
}

/** The typing placeholder as the composer's `placeholder`: the ticks
 *  re-render this text alone, not the page that offers the phrases. */
export function TypedPlaceholder({
  fallback,
  phrases,
}: {
  fallback: string
  phrases: readonly string[]
}) {
  return useTypedPlaceholder(phrases, fallback)
}

/** The placeholder to show now: `fallback` when there is nothing to
 *  type or motion is unwelcome, else the phrase in progress. */
function useTypedPlaceholder(phrases: readonly string[], fallback: string) {
  const [typed, setTyped] = useState<Typed>({
    index: 0,
    length: 0,
    phase: "typing",
  })
  const animated = phrases.length > 0 && !prefersReducedMotion()

  useEffect(() => {
    if (!animated) {
      return
    }

    const phrase = phrases[typed.index % phrases.length] ?? ""
    const timer = window.setTimeout(
      () => setTyped((current) => advance(current, phrase, phrases.length)),
      intervalFor(typed.phase)
    )

    return () => window.clearTimeout(timer)
  }, [animated, phrases, typed])

  if (!animated) {
    return fallback
  }

  return (phrases[typed.index % phrases.length] ?? "").slice(0, typed.length)
}

function advance(current: Typed, phrase: string, count: number): Typed {
  switch (current.phase) {
    case "typing":
      return current.length < phrase.length
        ? { ...current, length: current.length + 1 }
        : { ...current, phase: "holding" }
    case "holding":
      return { ...current, phase: "deleting" }
    case "deleting":
      return current.length > 0
        ? { ...current, length: current.length - 1 }
        : { ...current, phase: "resting" }
    case "resting":
      return { index: (current.index + 1) % count, length: 0, phase: "typing" }
  }
}

function intervalFor(phase: Phase) {
  switch (phase) {
    case "typing":
      return typeInterval
    case "holding":
      return holdInterval
    case "deleting":
      return deleteInterval
    case "resting":
      return restInterval
  }
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}
