import { type SearchResponse } from "@contracts/discovery"

type Entry = {
  promise: Promise<SearchResponse>
  response?: SearchResponse
  expires: number
}

/** Candidate IDs only, never excerpts or access decisions. Owned by one
 * mounted search session; keys include organization and explicit retries. */
export function candidateCache() {
  const entries = new Map<string, Entry>()
  function read(key: string) {
    const entry = entries.get(key)
    return entry && entry.expires > Date.now() ? entry.response : undefined
  }
  function load(key: string, fetch: () => Promise<SearchResponse>) {
    const previous = entries.get(key)
    if (previous && (!previous.response || read(key))) {
      entries.delete(key)
      entries.set(key, previous)
      return previous.promise
    }
    const entry: Entry = { expires: 0, promise: Promise.resolve().then(fetch) }
    entry.promise = entry.promise
      .then((response) => {
        if (response.unavailable || response.partial) {
          if (entries.get(key) === entry) {
            entries.delete(key)
          }
        } else {
          entry.response = response
          entry.expires = Date.now() + 15_000
        }
        return response
      })
      .catch((error: unknown) => {
        if (entries.get(key) === entry) {
          entries.delete(key)
        }
        throw error
      })
    entries.delete(key)
    entries.set(key, entry)
    while (entries.size > 20) {
      const oldest = entries.keys().next().value
      if (oldest !== undefined) {
        entries.delete(oldest)
      }
    }
    return entry.promise
  }
  return { read, load }
}
