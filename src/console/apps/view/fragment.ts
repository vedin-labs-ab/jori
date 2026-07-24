import { parseShareFragment, viewFragment } from "@contracts/apps/share"

type AppLocation = Pick<Location, "hash" | "pathname" | "search">

/** A successful member view no longer needs the capability secret. Keep only
 *  the non-secret fragment that addresses state inside the app. */
export function memberAppUrl(location: AppLocation) {
  if (parseShareFragment(location.hash) === null) {
    return null
  }

  const view = viewFragment(location.hash)
  const hash = view === null ? "" : `#${view}`

  return `${location.pathname}${location.search}${hash}`
}
