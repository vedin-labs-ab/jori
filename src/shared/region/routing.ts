import { isRegion, type Region } from "@contracts/region"
import { type RegionConfig, requireRegionOrigin } from "./config"
import { estimateRegion } from "./geography"
import { isMarketingPath } from "./paths"
import { readRegionPreference, regionPreferenceHeader } from "./preference"

// Public app links select a region; unknown URLs must reach the router's 404.
const appPath =
  /^\/(?:chat|console|context|deletion|files|folders|integrations|jobs|runs|sign-in|sign-out|skills|stores|tables)(?:\/|$)/

export function handleRegionRequest(
  request: Request,
  config: RegionConfig
): Response | null {
  const requestUrl = new URL(request.url)
  const requestOrigin = resolveRequestOrigin(request, config)
  const currentOrigin = requireRegionOrigin(config, config.current)

  if (requestOrigin === currentOrigin) {
    return regionalMarketingRedirect(request, requestUrl, currentOrigin, config)
  }

  const canonical = canonicalHostRedirect(request, requestUrl, config)

  if (canonical !== null) {
    return canonical
  }

  if (requestOrigin !== config.publicOrigin) {
    return textResponse("Misdirected request.", 421)
  }

  return publicRequest(request, requestUrl, config)
}

function regionalMarketingRedirect(
  request: Request,
  url: URL,
  origin: string,
  config: RegionConfig
) {
  if (origin === config.publicOrigin || !isMarketingPath(url.pathname)) {
    return null
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return textResponse("Misdirected request.", 421)
  }
  return redirectResponse(
    url.pathname === "/"
      ? new URL("/console", origin).toString()
      : new URL(url.pathname, config.publicOrigin).toString(),
    config.publicOrigin
  )
}

function publicRequest(
  request: Request,
  requestUrl: URL,
  config: RegionConfig
) {
  if (
    requestUrl.pathname === "/api" ||
    requestUrl.pathname.startsWith("/api/")
  ) {
    return textResponse("Not found.", 404)
  }

  if (requestUrl.pathname.startsWith("/region/")) {
    return handleRegionSelection(request, requestUrl, config)
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return textResponse("Misdirected request.", 421)
  }

  if (
    isMarketingPath(requestUrl.pathname) ||
    !appPath.test(requestUrl.pathname)
  ) {
    return null
  }

  const preferred = readRegionPreference(request.headers.get("cookie"), config)
  const region = preferred ?? estimateRegion(request, config)
  // A public link never carries tenant IDs, auth codes or return queries into
  // an inferred region. Existing deep links must name their regional host.
  const target = regionalUrl(
    config,
    region,
    requestUrl.pathname === "/sign-in" ? "/sign-in" : "/console"
  )

  return redirectResponse(
    target,
    config.publicOrigin,
    preferred === undefined ? region : undefined
  )
}

/** A first visit to the public origin pins the estimated region, so the
 *  page can file its analytics choice under one before any sign-in has
 *  chosen it; the sign-in redirect would pin the same estimate later. */
export function regionPinHeader(request: Request, config: RegionConfig) {
  const url = new URL(request.url)

  if (
    (request.method !== "GET" && request.method !== "HEAD") ||
    resolveRequestOrigin(request, config) !== config.publicOrigin ||
    !isMarketingPath(url.pathname) ||
    readRegionPreference(request.headers.get("cookie"), config) !== undefined
  ) {
    return undefined
  }

  return regionPreferenceHeader(
    estimateRegion(request, config),
    config.publicOrigin
  )
}

export function regionSelectionUrl(config: RegionConfig, region: Region) {
  requireEnabledRegion(config, region)
  const url = new URL(`/region/${region}`, config.publicOrigin)

  return url.toString()
}

function regionalUrl(config: RegionConfig, region: Region, path = "/") {
  return new URL(
    normalizeReturnPath(path),
    requireRegionOrigin(config, region)
  ).toString()
}

export function normalizeReturnPath(value: string | null | undefined) {
  if (value === null || value === undefined || !value.startsWith("/")) {
    return "/"
  }

  if (value.startsWith("//") || value.startsWith("/region/")) {
    return "/"
  }

  const url = new URL(value, "https://jori.invalid")

  return `${url.pathname}${url.search}${url.hash}`
}

function handleRegionSelection(
  request: Request,
  requestUrl: URL,
  config: RegionConfig
) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return textResponse("Method not allowed.", 405)
  }

  const candidate = requestUrl.pathname.slice("/region/".length)

  if (!isRegion(candidate) || !config.enabled.has(candidate)) {
    return textResponse("Region not available.", 404)
  }

  return redirectResponse(
    regionalUrl(config, candidate, "/sign-in"),
    config.publicOrigin,
    candidate
  )
}

/**
 * `www` is not a region. It is how people type the public origin, so it is
 * answered here rather than left to the host: a request that reaches the
 * application at all has already been routed correctly, and refusing it as a
 * wrong host would be a broken link for a spelling everyone uses.
 *
 * The redirect is permanent because the public origin is the canonical one and
 * that is not a preference the visitor can change.
 */
function canonicalHostRedirect(
  request: Request,
  requestUrl: URL,
  config: RegionConfig
) {
  const publicHost = new URL(config.publicOrigin).host

  if (resolveRequestHost(request, requestUrl) !== `www.${publicHost}`) {
    return null
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return textResponse("Misdirected request.", 421)
  }

  return new Response(null, {
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      Location: new URL(
        appPath.test(requestUrl.pathname) ? "/sign-in" : requestUrl.pathname,
        config.publicOrigin
      ).toString(),
    },
    status: 308,
  })
}

/** What the visitor typed, as the deployment's proxy reports it. */
function resolveRequestHost(request: Request, requestUrl: URL) {
  return forwardedHost(request) ?? requestUrl.host
}

function forwardedHost(request: Request) {
  return request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
}

function resolveRequestOrigin(request: Request, config: RegionConfig) {
  const directOrigin = new URL(request.url).origin
  const allowedOrigins = new Set([
    config.publicOrigin,
    ...Object.values(config.origins),
  ])

  if (allowedOrigins.has(directOrigin)) {
    return directOrigin
  }

  const host = forwardedHost(request)

  if (host !== undefined) {
    const forwardedOrigin = [...allowedOrigins].find(
      (origin) => new URL(origin).host === host
    )

    if (forwardedOrigin !== undefined) {
      return forwardedOrigin
    }
  }

  return directOrigin
}

function redirectResponse(
  location: string,
  publicOrigin: string,
  preference?: Region
) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    Location: location,
    Vary: "Cookie, CF-IPCountry, X-Vercel-IP-Country",
  })

  if (preference !== undefined) {
    headers.set("Set-Cookie", regionPreferenceHeader(preference, publicOrigin))
  }

  return new Response(null, { headers, status: 307 })
}

function requireEnabledRegion(config: RegionConfig, region: Region) {
  if (!config.enabled.has(region)) {
    throw new Error(`Region ${region} is not available.`)
  }
}

function textResponse(body: string, status: number) {
  return new Response(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
    status,
  })
}
