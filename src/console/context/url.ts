import { type ContextFacts } from "./types"

export type WebsiteItem = {
  href: string
  key: string
  label: string
  main: boolean
}

export function websiteItems(
  domains: ContextFacts["domains"],
  primaryWebsite: string | undefined
): WebsiteItem[] {
  const primary = websiteValue(primaryWebsite)
  const seen = new Set<string>()

  return [primaryWebsite, ...domains].flatMap((value) => {
    const website = websiteValue(value)

    if (website === null || seen.has(website.key)) {
      return []
    }

    seen.add(website.key)

    return [{ ...website, main: primary?.key === website.key }]
  })
}

export function sourceLabel(value: string) {
  const url = parseUrl(value)

  if (url === null) {
    return value
  }

  const hostname = url.hostname.replace(/^www[.]/, "")
  const path = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "")

  return `${hostname}${path}${url.search}`
}

function websiteValue(value: string | undefined) {
  const trimmed = value?.trim()

  if (trimmed === undefined || trimmed === "") {
    return null
  }

  const url = parseUrl(trimmed)

  if (url === null) {
    return { href: trimmed, key: trimmed.toLowerCase(), label: trimmed }
  }

  const hostname = url.hostname.replace(/^www[.]/, "")
  const key = `${hostname}${url.port === "" ? "" : `:${url.port}`}`

  return {
    href: url.origin,
    key: key.toLowerCase(),
    label: key,
  }
}

function parseUrl(value: string) {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`

  try {
    return new URL(withScheme)
  } catch {
    return null
  }
}
