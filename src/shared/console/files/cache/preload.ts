import { useEffect } from "react"
import { previewKind } from "@/shared/files/kind"
import { type FileSiblings } from "../siblings"
import { type FileRow } from "../types"
import { type FileSource, fileBlobCache, isCacheable } from "./blob"

/** Text files past this size skip the inline editor; the download covers
 *  them. */
export const textSizeLimit = 1024 * 1024

/** The fetchable source for a sibling row whose detail page renders an
 *  inline preview worth warming — media and editable text, not the
 *  download fallback — or null when preloading would be wasted. */
function warmableSource(row: FileRow): FileSource | null {
  if (row.url === null || !isCacheable(row.size)) {
    return null
  }

  const kind = previewKind(row.mimeType, row.name)

  if (kind === "none" || (kind === "text" && row.size > textSizeLimit)) {
    return null
  }

  return {
    fileId: row.fileId,
    size: row.size,
    updatedAt: row.updatedAt,
    url: row.url,
  }
}

/** Warms the cache for the previous and next siblings so stepping through
 *  files renders instantly. Callers pass `isReady` once the current file
 *  has settled, keeping the neighbors behind it in line for the network.
 *  Best-effort: failures stay silent, and the real view falls back to its
 *  own fetch. */
export function usePreloadSiblings(siblings: FileSiblings, isReady: boolean) {
  useEffect(() => {
    if (!isReady) {
      return
    }

    for (const row of [siblings.previous, siblings.next]) {
      const source = row === null ? null : warmableSource(row)

      if (source !== null) {
        void fileBlobCache.load(source).catch(() => undefined)
      }
    }
  }, [isReady, siblings])
}
