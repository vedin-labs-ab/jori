import { useEffect, useState } from "react"

export type ViewerStatus = "error" | "loading" | "ready"

/** How long the frame may sit on the spinner once the media has a URL.
 *  Some media never signals — a video whose codec the browser cannot
 *  decode fires neither loadedmetadata nor error — so after this the
 *  frame reveals the element anyway: its own chrome shows what it can,
 *  and a slow load simply completes in place. */
export const revealDeadline = 4000

/** Drives the frame from the media element's events, with the reveal
 *  deadline as the escape hatch, so loading always ends in content or an
 *  explicit error. A view still resolving its URL counts as loading;
 *  immediate kinds (audio, whose chrome renders at a fixed size) are
 *  ready as soon as they have a URL. */
export function useViewerStatus(url: string | null, isImmediate: boolean) {
  const [mediaStatus, setMediaStatus] = useState<ViewerStatus>(
    isImmediate ? "ready" : "loading"
  )
  const status: ViewerStatus = url === null ? "loading" : mediaStatus

  useEffect(() => {
    if (url === null || mediaStatus !== "loading") {
      return
    }

    const timer = setTimeout(() => setMediaStatus("ready"), revealDeadline)

    return () => clearTimeout(timer)
  }, [url, mediaStatus])

  return {
    markError: () => setMediaStatus("error"),
    markReady: () => setMediaStatus("ready"),
    status,
  }
}
