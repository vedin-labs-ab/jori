import Exa, { type ContentsOptions } from "exa-js"

const fetchMaxCharacters = 12_000
const fetchTimeoutMs = 15_000
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
  const bytes = new TextEncoder().encode(normalizeText(text))
  const digest = await crypto.subtle.digest("SHA-256", bytes)

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function fetchPage(
  url: string
): Promise<{ text: string; links: string[] } | null> {
  const response = await withTimeout(
    createExaClient().getContents(url, {
      livecrawl: "always",
      livecrawlTimeout: 8000,
      text: { maxCharacters: fetchMaxCharacters },
      extras: { links: maxLinksPerPage },
    } satisfies ContentsOptions),
    fetchTimeoutMs,
    "fetch"
  )
  const result = response.results[0]
  const text = readText(result)

  return text === null
    ? null
    : { text: normalizeText(text), links: readLinks(result) }
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

function readText(result: unknown) {
  if (typeof result !== "object" || result === null) {
    return null
  }

  return readString((result as Record<string, unknown>).text)
}

function readLinks(result: unknown): string[] {
  if (typeof result !== "object" || result === null) {
    return []
  }

  const extras = (result as Record<string, unknown>).extras

  if (typeof extras !== "object" || extras === null) {
    return []
  }

  const links = (extras as Record<string, unknown>).links

  return Array.isArray(links) ? links.filter(isString) : []
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function createExaClient() {
  return new Exa(requireExaApiKey())
}

function requireExaApiKey() {
  const apiKey = process.env.EXA_API_KEY?.trim()

  if (apiKey === undefined || apiKey === "") {
    throw new Error("Missing EXA_API_KEY")
  }

  return apiKey
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`${label} timed out`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout)
    }
  }
}
