import { useEffect, useState } from "react"
import {
  type CachedFile,
  type FileSource,
  fileBlobCache,
  isCacheable,
} from "./blob"

/** How long the view waits for the blob cache before streaming the
 *  network URL instead. Media elements can render from it immediately,
 *  and the blob fetch still finishes in the background to warm the next
 *  visit — so no spinner ever depends on an unbounded promise. */
export const displayDeadline = 2500

/** The URL the mounted view should render: the cached object URL when the
 *  blob is (or promptly becomes) cached, the network URL for files past
 *  the cache limit or when the blob is slow or fails, and null only for
 *  the moment an uncached blob is on its way. The source is frozen per
 *  mount — the signed network URL rotates with every query update, and
 *  swapping src mid-view would refetch the media — and the served entry is
 *  retained from mount to unmount so eviction never revokes an object URL
 *  that is on screen. */
export function useDisplayUrl(source: FileSource): string | null {
  const [frozen] = useState(source)
  const [peeked] = useState(() =>
    isCacheable(frozen.size) ? fileBlobCache.peek(frozen) : null
  )
  const [url, setUrl] = useState<string | null>(() =>
    isCacheable(frozen.size) ? (peeked?.objectUrl ?? null) : frozen.url
  )

  useEffect(() => {
    if (!isCacheable(frozen.size)) {
      return
    }

    if (peeked !== null) {
      if (fileBlobCache.retain(peeked)) {
        return () => fileBlobCache.release(peeked)
      }

      // The peeked entry died between render and mount; drop its URL so
      // nothing renders a revoked src while the reload runs.
      setUrl(null)
    }

    return loadWithDeadline(frozen, setUrl)
  }, [frozen, peeked])

  return url
}

/** Loads the blob and serves its object URL, retained for the view —
 *  unless the deadline passes first, in which case the network URL takes
 *  over for this mount and a late blob only warms the cache. Returns the
 *  unmount cleanup. */
function loadWithDeadline(
  frozen: FileSource,
  setUrl: (url: string | null) => void
) {
  let isMounted = true
  let didFallBack = false
  let retained: CachedFile | null = null
  const fallBack = () => {
    didFallBack = true
    setUrl(frozen.url)
  }
  const deadline = setTimeout(() => {
    if (isMounted) {
      fallBack()
    }
  }, displayDeadline)

  const serve = (cached: CachedFile) => {
    if (!isMounted || didFallBack) {
      return
    }

    if (fileBlobCache.retain(cached)) {
      retained = cached
      setUrl(cached.objectUrl)
    } else {
      fallBack()
    }
  }

  void fileBlobCache
    .load(frozen)
    .then(serve)
    .catch(() => {
      if (isMounted && !didFallBack) {
        fallBack()
      }
    })
    .finally(() => clearTimeout(deadline))

  return () => {
    isMounted = false
    clearTimeout(deadline)

    if (retained !== null) {
      fileBlobCache.release(retained)
    }
  }
}
