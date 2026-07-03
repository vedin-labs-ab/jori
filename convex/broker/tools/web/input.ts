import {
  isPublicHostname,
  normalizeHostname,
} from "../../../../contracts/website"
import { boundedNumber, requiredString } from "../../../shared/input"

const defaultFetchCharacters = 8000
const defaultSearchCharacters = 1200
const maxFetchCharacters = 20_000
const maxSearchCharacters = 4000
const maxSearchQueryLength = 1000
const maxDomainFilters = 20

export type WebSearchInput = {
  query: string
  limit: number
  maxCharacters: number
  includeDomains?: string[]
  excludeDomains?: string[]
}

export type WebFetchInput = {
  url: string
  maxCharacters: number
  highlightQuery?: string
}

export function normalizeWebSearchInput(
  args: Record<string, unknown>
): WebSearchInput {
  return {
    query: normalizeQuery(args.query),
    limit: boundedNumber(args.limit, 5, 1, 10),
    maxCharacters: boundedNumber(
      args.maxCharacters,
      defaultSearchCharacters,
      250,
      maxSearchCharacters
    ),
    includeDomains: normalizeDomains(args.includeDomains, "includeDomains"),
    excludeDomains: normalizeDomains(args.excludeDomains, "excludeDomains"),
  }
}

export function normalizeWebFetchInput(
  args: Record<string, unknown>
): WebFetchInput {
  const highlightQuery = optionalQuery(args.highlightQuery)

  return {
    url: normalizePublicHttpUrl(args.url, "url"),
    maxCharacters: boundedNumber(
      args.maxCharacters,
      defaultFetchCharacters,
      1000,
      maxFetchCharacters
    ),
    ...(highlightQuery === undefined ? {} : { highlightQuery }),
  }
}

function normalizeQuery(value: unknown) {
  const query = requiredString(value, "query")

  if (query.length > maxSearchQueryLength) {
    throw new Error("query is too long")
  }

  return query
}

function optionalQuery(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined
  }

  return normalizeQuery(value)
}

function normalizeDomains(value: unknown, name: string) {
  if (!Array.isArray(value)) {
    return undefined
  }

  if (value.length > maxDomainFilters) {
    throw new Error(`${name} has too many domains`)
  }

  const domains = value.map((domain) => normalizeDomain(domain, name))

  return domains.length === 0 ? undefined : [...new Set(domains)]
}

function normalizeDomain(value: unknown, name: string) {
  const domain = requiredString(value, name).toLowerCase().replace(/[.]$/, "")

  if (domain.includes("://") || /[:/@?#]/.test(domain)) {
    throw new Error(`${name} must contain domains only`)
  }

  const url = new URL(`https://${domain}`)
  const hostname = normalizeHostname(url.hostname)

  if (url.port !== "") {
    throw new Error(`${name} must contain domains only`)
  }

  requirePublicHostname(hostname, name)

  return hostname
}

export function normalizePublicHttpUrl(value: unknown, name: string) {
  const rawUrl = requiredString(value, name)
  const url = parseUrl(rawUrl, name)

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} must be an HTTP or HTTPS URL`)
  }

  if (url.username !== "" || url.password !== "") {
    throw new Error(`${name} must not include credentials`)
  }

  requirePublicHostname(normalizeHostname(url.hostname), name)
  url.hash = ""

  return url.toString()
}

function parseUrl(value: string, name: string) {
  try {
    return new URL(value)
  } catch {
    throw new Error(`${name} must be a valid URL`)
  }
}

function requirePublicHostname(hostname: string, name: string) {
  if (!isPublicHostname(hostname)) {
    throw new Error(`${name} must target a public host`)
  }
}
