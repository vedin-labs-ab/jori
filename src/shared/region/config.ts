import { isRegion, type Region, regions } from "@contracts/region"

const localOrigin = "http://localhost:5173"

const environmentNames = {
  current: "VITE_JORI_REGION",
  enabled: "VITE_JORI_ENABLED_REGIONS",
  publicOrigin: "VITE_JORI_PUBLIC_ORIGIN",
  origins: {
    eu: "VITE_JORI_EU_ORIGIN",
    us: "VITE_JORI_US_ORIGIN",
  },
} as const

type RegionEnvironment = Record<string, boolean | string | undefined>

export type RegionConfig = {
  current: Region
  enabled: ReadonlySet<Region>
  origins: Partial<Record<Region, string>>
  publicOrigin: string
}

export function createRegionConfig(
  environment: RegionEnvironment,
  development: boolean
): RegionConfig {
  const current = readCurrentRegion(environment, development)
  const enabled = readEnabledRegions(environment)
  const fallbackOrigin = development ? localOrigin : undefined
  const publicOrigin = readOrigin(
    environment,
    environmentNames.publicOrigin,
    fallbackOrigin
  )
  const origins = Object.fromEntries(
    regions.flatMap((region) => {
      const origin = readOptionalOrigin(
        environment,
        environmentNames.origins[region],
        region === current ? fallbackOrigin : undefined
      )

      return origin === undefined ? [] : [[region, origin]]
    })
  ) as Partial<Record<Region, string>>

  if (!enabled.has(current)) {
    throw new Error(`Current region ${current} must be enabled.`)
  }

  for (const region of enabled) {
    if (origins[region] === undefined) {
      throw new Error(`${environmentNames.origins[region]} must be configured.`)
    }
  }

  const enabledOrigins = [...enabled].map((region) => origins[region])

  if (new Set(enabledOrigins).size !== enabledOrigins.length) {
    throw new Error("Enabled regions must use distinct origins.")
  }

  if (enabled.size > 1 && enabledOrigins.includes(publicOrigin)) {
    throw new Error(
      "The public origin must be separate from regional instances."
    )
  }

  return { current, enabled, origins, publicOrigin }
}

export function requireRegionOrigin(config: RegionConfig, region: Region) {
  const origin = config.origins[region]

  if (origin === undefined) {
    throw new Error(`Missing origin for region ${region}.`)
  }

  return origin
}

function readCurrentRegion(
  environment: RegionEnvironment,
  development: boolean
) {
  const value = readString(environment, environmentNames.current)

  if (value === undefined && development) {
    return "us"
  }

  if (!isRegion(value)) {
    throw new Error(`${environmentNames.current} must be "us" or "eu".`)
  }

  return value
}

function readEnabledRegions(environment: RegionEnvironment) {
  const value = readString(environment, environmentNames.enabled) ?? "us"
  const enabled = new Set<Region>()

  for (const candidate of value.split(",").map((part) => part.trim())) {
    if (!isRegion(candidate)) {
      throw new Error(
        `${environmentNames.enabled} contains an unknown region: ${candidate || "empty value"}.`
      )
    }

    enabled.add(candidate)
  }

  return enabled
}

function readOrigin(
  environment: RegionEnvironment,
  name: string,
  fallback: string | undefined
) {
  const origin = readOptionalOrigin(environment, name, fallback)

  if (origin === undefined) {
    throw new Error(`${name} must be configured.`)
  }

  return origin
}

function readOptionalOrigin(
  environment: RegionEnvironment,
  name: string,
  fallback: string | undefined
) {
  const value = readString(environment, name) ?? fallback

  if (value === undefined) {
    return undefined
  }

  let url: URL

  try {
    url = new URL(value.replace(/\/+$/, ""))
  } catch {
    throw new Error(originError(name, value))
  }

  if (
    url.origin !== value.replace(/\/+$/, "") ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && url.protocol !== "http:")
  ) {
    throw new Error(originError(name, value))
  }

  return url.origin
}

function readString(environment: RegionEnvironment, name: string) {
  const value = environment[name]

  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

function originError(name: string, value: string) {
  return `${name} must be an http(s) origin, received ${JSON.stringify(value)}.`
}

export const regionConfig = createRegionConfig(
  import.meta.env,
  import.meta.env.DEV
)
