let hasPrefetchedGrammars = false

/** Only mounted markdown schedules speculative work. A cancelled mount
 *  leaves the next one free to prefetch, including React's StrictMode
 *  remount. Concurrent mounts share the import once it actually starts. */
export function prefetchGrammars() {
  if (hasPrefetchedGrammars) {
    return
  }

  const prefetch = () => {
    if (!hasPrefetchedGrammars) {
      hasPrefetchedGrammars = true
      void import("./grammars")
    }
  }

  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(prefetch)
    return () => window.cancelIdleCallback(handle)
  }

  const handle = window.setTimeout(prefetch, 200)
  return () => window.clearTimeout(handle)
}
