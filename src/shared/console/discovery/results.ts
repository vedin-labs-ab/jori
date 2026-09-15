import { type Hit } from "@contracts/discovery"
import { referenceDestination } from "../references/presentation"
import {
  consoleNavigation,
  consolePlatformNavigation,
  folderSurface,
} from "../shell/routes"
import { type SearchPage } from "./types"

export function hitDestination(hit: Hit) {
  return referenceDestination({ kind: hit.kind, id: hit.resourceId })
}

export const pages: readonly SearchPage[] = [
  ...consoleNavigation.flatMap((group) => group.items),
  ...consolePlatformNavigation,
  folderSurface,
]
export function matchingPages(
  text: string,
  available: readonly SearchPage[] = pages
) {
  const words = text.toLowerCase().trim().split(/\s+/)
  if (!text.trim()) {
    return []
  }
  return available.filter((page) =>
    words.every((word) =>
      page.label
        .toLowerCase()
        .split(/\s+/)
        .some((part) => part.startsWith(word))
    )
  )
}
