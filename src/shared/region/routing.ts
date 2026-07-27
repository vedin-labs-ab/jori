import { isRegion, type Region } from "@contracts/region"
import { type RegionConfig, requireRegionOrigin } from "./config"
import { estimateRegion } from "./geography"
import { readRegionPreference, regionPreferenceHeader } from "./preference"

export function handleRegionRequest(
  request: Request,
  config: RegionConfig
): Response | null {
  const requestUrl = new URL(request.url)
  const requestOrigin = resolveRequestOrigin(request, config)
  const currentOrigin = requireRegionOrigin(config, config.current)

  if (requestOrigin === currentOrigin) {
    return null
  }

  const canonical = canonicalHostRedirect(request, requestUrl, config)

  if (canonical !== null) {
    return canonical
  }

  if (requestOrigin !== config.publicOrigin) {
    return textResponse("Misdirected request.", 421)
  }

  if (
    requestUrl.pathname === "/api/auth" ||
    requestUrl.pathname.startsWith("/api/auth/")
  ) {
    return textResponse("Not found.", 404)
  }

  if (requestUrl.pathname.startsWith("/region/")) {
    return handleRegionSelection(request, requestUrl, config)
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return textResponse("Misdirected request.", 421)
  }

  const preferred = readRegionPreference(request, config)
  const region = preferred ?? estimateRegion(request, config)
  const target = regionalUrl(config, region, requestPath(requestUrl))

  return redirectResponse(
    target,
    config.publicOrigin,
    preferred === undefined ? region : undefined
  )
}

export function regionSelectionUrl(
  config: RegionConfig,
  region: Region,
  returnTo: string
) {
  requireEnabledRegion(config, region)
  const url = new URL(`/region/${region}`, config.publicOrigin)

  url.searchParams.set("returnTo", normalizeReturnPath(returnTo))
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

  const returnTo = normalizeReturnPath(requestUrl.searchParams.get("returnTo"))

  return redirectResponse(
    regionalUrl(config, candidate, returnTo),
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

  return new Response(null, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      Location: new URL(
        normalizeReturnPath(requestPath(requestUrl)),
        config.publicOrigin
      ).toString(),
    },
    status: 308,
  })
}

/** What the visitor typed, as the deployment's proxy reports it. */
function resolveRequestHost(request: Request, requestUrl: URL) {
  return (
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    requestUrl.host
  )
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

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim()

  if (forwardedHost !== undefined) {
    const forwardedOrigin = [...allowedOrigins].find(
      (origin) => new URL(origin).host === forwardedHost
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

function requestPath(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`
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
