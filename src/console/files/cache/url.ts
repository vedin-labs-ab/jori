import { useEffect, useState } from "react"
import { type FileSource, fileBlobCache, isCacheable } from "./blob"

/** The URL the mounted view should render: the cached object URL when the
 *  blob is (or becomes) cached, the network URL for files past the cache
 *  limit or when the blob fetch fails, and null while an uncached blob is
 *  still on its way. The source is frozen per mount — the signed network
 *  URL rotates with every query update, and swapping src mid-view would
 *  refetch the media — and the entry is retained until unmount so eviction
 *  never revokes an object URL that is on screen. */
export function useDisplayUrl(source: FileSource): string | null {
  const [frozen] = useState(source)
  const [url, setUrl] = useState<string | null>(() =>
    isCacheable(frozen.size)
      ? (fileBlobCache.peek(frozen)?.objectUrl ?? null)
      : frozen.url
  )

  useEffect(() => {
    if (!isCacheable(frozen.size)) {
      return
    }

    let isMounted = true
    let isRetained = false

    void fileBlobCache
      .load(frozen)
      .then((cached) => {
        if (!isMounted) {
          return
        }

        fileBlobCache.retain(frozen)
        isRetained = true
        setUrl(cached.objectUrl)
      })
      .catch(() => {
        if (isMounted) {
          setUrl(frozen.url)
        }
      })

    return () => {
      isMounted = false

      if (isRetained) {
        fileBlobCache.release(frozen)
      }
    }
  }, [frozen])

  return url
}
