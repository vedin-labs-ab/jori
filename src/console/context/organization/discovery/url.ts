import { parseWebsiteAddress, type WebsiteAddress } from "@contracts/website"
import { showErrorToast } from "../../../shared/error"
import { type ContextFacts } from "../types"

export type WebsiteItem = WebsiteAddress & {
  main: boolean
}

export function websiteItems(
  domains: ContextFacts["domains"],
  primaryWebsite: string | undefined
): WebsiteItem[] {
  const primary = parseWebsiteAddress(primaryWebsite)
  const seen = new Set<string>()

  return [primaryWebsite, ...domains].flatMap((value) => {
    const website = parseWebsiteAddress(value)

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

export function websiteDomainKey(value: string | undefined) {
  return parseWebsiteAddress(value)?.key ?? null
}

export function reportWebsiteStartError(
  caught: unknown,
  setInputError: (error: string | null) => void
) {
  const inputError = readWebsiteInputError(caught)

  if (inputError === null) {
    showErrorToast(caught, "Couldn't start the extraction.")
  } else {
    setInputError(inputError)
  }
}

export const websiteInputErrorCopy = "Enter a public website, like example.com."

export function readWebsiteInputError(caught: unknown) {
  if (
    caught instanceof Error &&
    caught.message.includes("must target a public website")
  ) {
    return websiteInputErrorCopy
  }

  return null
}

function parseUrl(value: string) {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`

  try {
    return new URL(withScheme)
  } catch {
    return null
  }
}
