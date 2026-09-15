import { type Hit } from "@contracts/discovery"
import { referenceDestination } from "../references/presentation"
import { consoleNavigation, consolePlatformNavigation } from "../shell/routes"

export function hitDestination(hit: Hit) {
  return referenceDestination({ kind: hit.kind, id: hit.resourceId })
}

const pages = [
  ...consoleNavigation.flatMap((group) => group.items),
  ...consolePlatformNavigation,
]
export function matchingPages(text: string) {
  const words = text.toLowerCase().trim().split(/\s+/)
  if (!text.trim()) {
    return []
  }
  return pages.filter((page) =>
    words.every((word) =>
      page.label
        .toLowerCase()
        .split(/\s+/)
        .some((part) => part.startsWith(word))
    )
  )
}
