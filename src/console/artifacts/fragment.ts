import { parseShareFragment, viewFragment } from "@contracts/artifacts/share"

type ArtifactLocation = Pick<Location, "hash" | "pathname" | "search">

/** A successful member view no longer needs the capability secret. Keep only
 *  the non-secret fragment that addresses state inside the artifact. */
export function memberArtifactUrl(location: ArtifactLocation) {
  if (parseShareFragment(location.hash) === null) {
    return null
  }

  const view = viewFragment(location.hash)
  const hash = view === null ? "" : `#${view}`

  return `${location.pathname}${location.search}${hash}`
}
