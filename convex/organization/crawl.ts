import { collapseWhitespace } from "../../contracts/text"
import { createSearchClient } from "../search"
import { sha256Hex } from "../shared/crypto"

const fetchMaxCharacters = 12_000
const maxLinksPerPage = 50

export type CrawledPage = {
  url: string
  text: string
  hash: string
  links: string[]
}

// Fetches one page, fingerprints it, and keeps the links found on it so the
// navigator can decide where to go next. Used both when a draft baselines a
// source and (via fetchReadableText) when the watcher re-checks it, so the same
// content always produces the same hash.
export async function crawlPage(url: string): Promise<CrawledPage | null> {
  const page = await fetchPage(url)

  if (page === null) {
    return null
  }

  return {
    url,
    text: page.text,
    hash: await hashText(page.text),
    links: page.links,
  }
}

export async function fetchReadableText(url: string): Promise<string | null> {
  const page = await fetchPage(url)

  return page === null ? null : page.text
}

// The same-host links found across the crawled pages that haven't been fetched
// yet — the candidate set the navigator chooses from each round.
export function candidateLinks(host: string, pages: CrawledPage[]): string[] {
  const fetched = new Set(
    pages.map((page) => normalizeLink(page.url)).filter(isString)
  )
  const seen = new Set<string>()
  const candidates: string[] = []

  for (const page of pages) {
    for (const link of page.links) {
      const key = normalizeLink(link)

      if (key === null || fetched.has(key) || seen.has(key)) {
        continue
      }

      if (hostFromUrl(link) !== host) {
        continue
      }

      seen.add(key)
      candidates.push(link)
    }
  }

  return candidates
}

// Canonical key for a URL so the same page reached by different links (trailing
// slash, query, fragment, www) is only fetched and offered once.
export function normalizeLink(url: string): string | null {
  try {
    const parsed = new URL(url)

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null
    }

    const host = parsed.hostname.replace(/^www\./, "")
    const path = parsed.pathname.replace(/\/+$/, "")

    return `${host}${path}`.toLowerCase()
  } catch {
    return null
  }
}

export function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

export async function hashText(text: string): Promise<string> {
  return await sha256Hex(collapseWhitespace(text))
}

async function fetchPage(
  url: string
): Promise<{ text: string; links: string[] } | null> {
  const response = await createSearchClient().fetch({
    url,
    refresh: true,
    maxCharacters: fetchMaxCharacters,
    maxLinks: maxLinksPerPage,
  })
  const result = response.results[0]
  const text = result?.text

  return text === undefined || text.trim() === ""
    ? null
    : { text: collapseWhitespace(text), links: result.links }
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}
