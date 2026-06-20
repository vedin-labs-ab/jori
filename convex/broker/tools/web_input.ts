import { boundedNumber, requiredString } from "../../shared/input"

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
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    (!hostname.includes(".") && !hostname.includes(":")) ||
    isPrivateIp(hostname)
  ) {
    throw new Error(`${name} must target a public host`)
  }
}

function normalizeHostname(hostname: string) {
  return hostname
    .toLowerCase()
    .replace(/^\[(.*)\]$/, "$1")
    .replace(/[.]$/, "")
}

function isPrivateIp(hostname: string) {
  if (hostname.includes(":")) {
    return isPrivateIpv6(hostname)
  }

  return isPrivateIpv4(hostname)
}

function isPrivateIpv4(hostname: string) {
  if (!/^\d{1,3}(?:[.]\d{1,3}){3}$/.test(hostname)) {
    return false
  }

  const parts = hostname.split(".").map(Number)

  if (parts.some((part) => part < 0 || part > 255)) {
    throw new Error("url must be a valid public host")
  }

  const [first, second] = parts

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19))
  )
}

function isPrivateIpv6(hostname: string) {
  return (
    hostname === "::" ||
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    /^fe[89ab]/.test(hostname) ||
    isPrivateMappedIpv4(hostname)
  )
}

function isPrivateMappedIpv4(hostname: string) {
  const mapped = hostname.match(/^::ffff:(\d{1,3}(?:[.]\d{1,3}){3})$/)

  return mapped === null ? false : isPrivateIpv4(mapped[1])
}
