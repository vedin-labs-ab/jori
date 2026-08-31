// In-memory cache of file blobs behind object URLs, so revisiting a file
// or stepping to a preloaded neighbor renders with no network fetch.
// Entries key on file id plus updatedAt, so replacing a file's content —
// the editor's autosave included — naturally misses the stale blob and
// refetches; the TTL and byte budget only govern memory.

/** What the cache needs to know about a file to fetch and key its blob.
 *  Both the detail query and the sibling list rows carry these fields. */
export type FileSource = {
  fileId: string
  size: number
  updatedAt: number
  url: string
}

/** A cached blob and the object URL that serves it to media elements. */
export type CachedFile = {
  blob: Blob
  objectUrl: string
}

type Entry = CachedFile & {
  bytes: number
  fetchedAt: number
  isRevoked: boolean
  key: string
  lastUsedAt: number
  refCount: number
}

export type CacheLimits = {
  /** Total bytes held across entries before the least recent are evicted. */
  maxBytes: number
  maxEntries: number
  /** How long an entry stays servable to new views, in milliseconds. */
  ttl: number
}

/** Files past this size never enter the cache: a blob download pulls the
 *  whole file up front, so large media streams from the network URL. */
export const cacheSizeLimit = 50 * 1024 * 1024

/** How long a fetch may run before it is abandoned. Views never wait for
 *  it — they fall back to the network URL on their own, much shorter
 *  deadline — but a stalled request must not wedge this key's in-flight
 *  slot forever, or no later visit could ever retry. */
export const fetchTimeout = 60 * 1000

/** How long an evicted entry's object URL stays valid. A consumer that
 *  just received the entry — resolution and retain sit a microtask or a
 *  render apart — can still pin it, so a revoked URL never reaches a
 *  mounted view. */
export const revokeGrace = 5 * 1000

export function isCacheable(size: number): boolean {
  return size <= cacheSizeLimit
}

const defaultLimits: CacheLimits = {
  maxBytes: 150 * 1024 * 1024,
  maxEntries: 64,
  ttl: 15 * 60 * 1000,
}

class BlobCache {
  private readonly entries = new Map<string, Entry>()
  private readonly limits: CacheLimits
  private readonly pending = new Map<string, Promise<Entry>>()
  private totalBytes = 0

  constructor(limits: CacheLimits) {
    this.limits = limits
  }

  /** The cached blob for the source when it is servable: fresh, or still
   *  retained by a mounted view — the key pins the content, so age never
   *  makes an entry wrong, and serving a retained one avoids ever holding
   *  two object URLs for the same bytes. */
  peek(source: FileSource): CachedFile | null {
    const entry = this.entries.get(cacheKey(source))

    if (entry === undefined) {
      return null
    }

    if (this.isExpired(entry) && entry.refCount === 0) {
      this.evict(entry)

      return null
    }

    entry.lastUsedAt = Date.now()

    return entry
  }

  /** The cached blob, fetching on a miss. Concurrent loads for the same
   *  key share one fetch; failures are not cached. */
  async load(source: FileSource): Promise<CachedFile> {
    const cached = this.peek(source)

    if (cached !== null) {
      return cached
    }

    const key = cacheKey(source)
    const inFlight = this.pending.get(key)

    if (inFlight !== undefined) {
      return await inFlight
    }

    const request = this.fetchEntry(key, source.url).finally(() => {
      this.pending.delete(key)
    })

    this.pending.set(key, request)

    return await request
  }

  /** Pins the exact blob a view renders, so eviction never revokes an
   *  object URL that is on screen. Entry-based rather than key-based: it
   *  still works on an entry evicted a moment ago, whose URL lives on
   *  through the revocation grace. False means the grace already passed —
   *  the URL is dead and the caller must load again or fall back. */
  retain(cached: CachedFile): boolean {
    const entry = cached as Entry

    if (entry.isRevoked) {
      return false
    }

    entry.refCount += 1

    return true
  }

  release(cached: CachedFile) {
    const entry = cached as Entry

    entry.refCount = Math.max(0, entry.refCount - 1)

    if (entry.refCount > 0) {
      return
    }

    if (this.entries.get(entry.key) !== entry) {
      // Evicted while retained; nothing else will revoke it now.
      this.revoke(entry)
    } else if (this.isExpired(entry)) {
      this.evict(entry)
    }
  }

  private async fetchEntry(key: string, url: string): Promise<Entry> {
    // Bounded, and shared through the in-flight map — never aborted per
    // consumer, since a departing view simply detaches from the promise.
    const response = await fetch(url, {
      signal: AbortSignal.timeout(fetchTimeout),
    })

    if (!response.ok) {
      throw new Error(`Fetching the file failed (${response.status}).`)
    }

    return this.store(key, await response.blob())
  }

  private store(key: string, blob: Blob): Entry {
    const existing = this.entries.get(key)

    if (existing !== undefined) {
      return existing
    }

    const entry: Entry = {
      blob,
      bytes: blob.size,
      fetchedAt: Date.now(),
      isRevoked: false,
      key,
      lastUsedAt: Date.now(),
      objectUrl: URL.createObjectURL(blob),
      refCount: 0,
    }

    this.entries.set(key, entry)
    this.totalBytes += entry.bytes
    this.shrink(entry)

    return entry
  }

  /** Evicts the least recently used idle entries until the cache fits its
   *  budget, never touching retained entries or the one just stored. */
  private shrink(keep: Entry) {
    while (
      this.entries.size > this.limits.maxEntries ||
      this.totalBytes > this.limits.maxBytes
    ) {
      const victim = this.oldestIdle(keep)

      if (victim === undefined) {
        return
      }

      this.evict(victim)
    }
  }

  private oldestIdle(keep: Entry): Entry | undefined {
    let oldest: Entry | undefined

    for (const entry of this.entries.values()) {
      if (entry === keep || entry.refCount > 0) {
        continue
      }

      if (oldest === undefined || entry.lastUsedAt < oldest.lastUsedAt) {
        oldest = entry
      }
    }

    return oldest
  }

  /** Drops the entry from the cache and revokes its object URL after the
   *  grace — unless a consumer that already held the entry pins it in the
   *  meantime, in which case its release performs the revocation. */
  private evict(entry: Entry) {
    this.entries.delete(entry.key)
    this.totalBytes -= entry.bytes
    setTimeout(() => {
      if (entry.refCount === 0) {
        this.revoke(entry)
      }
    }, revokeGrace)
  }

  private revoke(entry: Entry) {
    if (!entry.isRevoked) {
      entry.isRevoked = true
      URL.revokeObjectURL(entry.objectUrl)
    }
  }

  private isExpired(entry: Entry) {
    return Date.now() - entry.fetchedAt > this.limits.ttl
  }
}

/** Keys on content identity: replacing a file's blob bumps updatedAt, so
 *  the stale entry is simply never asked for again. */
function cacheKey(source: FileSource) {
  return `${source.fileId}:${source.updatedAt}`
}

export function createBlobCache(limits: Partial<CacheLimits> = {}) {
  return new BlobCache({ ...defaultLimits, ...limits })
}

/** The app-wide instance every file view and preload shares. */
export const fileBlobCache = createBlobCache()
