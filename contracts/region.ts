export const regions = ["us", "eu"] as const

export type Region = (typeof regions)[number]

export function isRegion(value: unknown): value is Region {
  return regions.some((region) => region === value)
}

/** Validate a configured public or regional origin without reading its environment. */
export function parseOrigin(value: string, name: string) {
  const normalized = value.replace(/\/+$/, "")
  const error = `${name} must be an http(s) origin, received ${JSON.stringify(value)}.`
  let url: URL

  try {
    url = new URL(normalized)
  } catch {
    throw new Error(error)
  }

  if (
    url.origin !== normalized ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && url.protocol !== "http:")
  ) {
    throw new Error(error)
  }

  return url.origin
}
