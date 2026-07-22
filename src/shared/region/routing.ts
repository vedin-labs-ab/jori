import { isRegion, type Region } from "@contracts/region"
import { type RegionConfig, requireRegionOrigin } from "./config"

const preferenceCookie = "milo_region"
const preferenceMaxAgeSeconds = 60 * 60 * 24 * 365
const euCountryCodes = new Set([
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
])

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

  const preferred = readPreference(request, config)
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

export function regionalUrl(config: RegionConfig, region: Region, path = "/") {
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

  const url = new URL(value, "https://milo.invalid")

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

function readPreference(request: Request, config: RegionConfig) {
  const header = request.headers.get("cookie")

  if (header === null) {
    return undefined
  }

  for (const part of header.split(";")) {
    const [name, ...valueParts] = part.trim().split("=")

    if (name !== preferenceCookie) {
      continue
    }

    const value = valueParts.join("=")

    return isRegion(value) && config.enabled.has(value) ? value : undefined
  }

  return undefined
}

function estimateRegion(request: Request, config: RegionConfig): Region {
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry")
  const estimate =
    country !== null && euCountryCodes.has(country.toUpperCase()) ? "eu" : "us"

  if (config.enabled.has(estimate)) {
    return estimate
  }

  return config.current
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
    headers.set("Set-Cookie", preferenceHeader(preference, publicOrigin))
  }

  return new Response(null, { headers, status: 307 })
}

function preferenceHeader(region: Region, publicOrigin: string) {
  const secure = new URL(publicOrigin).protocol === "https:" ? "; Secure" : ""

  return `${preferenceCookie}=${region}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${preferenceMaxAgeSeconds}${secure}`
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
