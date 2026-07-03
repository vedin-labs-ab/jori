export type WebsiteAddress = {
  href: string
  key: string
  label: string
}

export function parseWebsiteAddress(value: string | undefined) {
  const trimmed = value?.trim()

  if (trimmed === undefined || trimmed === "") {
    return null
  }

  const url = parseWebsiteUrl(trimmed)

  if (url === null || !isPublicHostname(url.hostname)) {
    return null
  }

  const hostname = displayHostname(url.hostname)
  const key = `${hostname}${url.port === "" ? "" : `:${url.port}`}`

  return {
    href: url.origin,
    key: key.toLowerCase(),
    label: key,
  } satisfies WebsiteAddress
}

export function normalizeWebsiteAddress(value: unknown, name = "website") {
  if (typeof value !== "string") {
    throw new Error(`${name} is required`)
  }

  const address = parseWebsiteAddress(value)

  if (address === null) {
    throw new Error(`${name} must target a public website`)
  }

  return address.href
}

function parseWebsiteUrl(value: string) {
  const normalized = normalizeWebsiteInput(value)

  if (normalized === null) {
    return null
  }

  try {
    const url = new URL(normalized)

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username !== "" ||
      url.password !== "" ||
      url.hostname.trim() === ""
    ) {
      return null
    }

    return url
  } catch {
    return null
  }
}

function normalizeWebsiteInput(value: string) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) {
    return null
  }

  const scheme = value.match(/^(https?):\/{0,2}/i)

  if (scheme !== null) {
    const rest = value.slice(scheme[0].length)

    return rest === "" ? null : `${scheme[1].toLowerCase()}://${rest}`
  }

  return `https://${value}`
}

function displayHostname(hostname: string) {
  return normalizeHostname(hostname).replace(/^www[.]/, "")
}

export function isPublicHostname(hostname: string) {
  const normalized = normalizeHostname(hostname)

  return (
    normalized !== "localhost" &&
    !normalized.endsWith(".localhost") &&
    !normalized.endsWith(".local") &&
    (normalized.includes(".") || normalized.includes(":")) &&
    !isPrivateIp(normalized)
  )
}

export function normalizeHostname(hostname: string) {
  return hostname
    .toLowerCase()
    .replace(/^\[(.*)\]$/, "$1")
    .replace(/[.]$/, "")
}

function isPrivateIp(hostname: string) {
  return hostname.includes(":")
    ? isPrivateIpv6(hostname)
    : isPrivateIpv4(hostname)
}

function isPrivateIpv4(hostname: string) {
  if (!/^\d{1,3}(?:[.]\d{1,3}){3}$/.test(hostname)) {
    return false
  }

  const parts = hostname.split(".").map(Number)

  if (parts.some((part) => part < 0 || part > 255)) {
    return true
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
