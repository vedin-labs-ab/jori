import Exa, { type ContentsOptions, type RegularSearchOptions } from "exa-js"

const fetchMaxCharacters = 12_000
const fetchTimeoutMs = 15_000
const searchTimeoutMs = 12_000
const discoveryResults = 6
const maxDiscovered = 5

export type CrawledPage = {
  url: string
  text: string
  hash: string
}

// Fetches one page and fingerprints it. Used both when a draft baselines a
// source and (via fetchReadableText) when the watcher re-checks it, so the same
// content always produces the same hash.
export async function crawlPage(url: string): Promise<CrawledPage | null> {
  const text = await fetchReadableText(url)

  if (text === null) {
    return null
  }

  return { url, text, hash: await hashText(text) }
}

export async function fetchReadableText(url: string): Promise<string | null> {
  const response = await withTimeout(
    createExaClient().getContents(url, {
      livecrawl: "always",
      livecrawlTimeout: 8000,
      text: { maxCharacters: fetchMaxCharacters },
    } satisfies ContentsOptions),
    fetchTimeoutMs,
    "fetch"
  )
  const text = readText(response.results[0])

  return text === null ? null : normalizeText(text)
}

export async function discoverUrls(
  host: string,
  seedUrl: string
): Promise<string[]> {
  const response = await withTimeout(
    createExaClient().search(`${host} about product pricing customers`, {
      includeDomains: [host],
      numResults: discoveryResults,
      type: "auto",
    } satisfies RegularSearchOptions),
    searchTimeoutMs,
    "discover"
  )
  const urls = response.results
    .map((result) => readString(result.url))
    .filter((url): url is string => url !== null && url !== seedUrl)

  return [...new Set(urls)].slice(0, maxDiscovered)
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

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

function readText(result: unknown) {
  if (typeof result !== "object" || result === null) {
    return null
  }

  return readString((result as Record<string, unknown>).text)
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null
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
