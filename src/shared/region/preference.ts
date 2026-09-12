import { isRegion, type Region } from "@contracts/region"
import { readCookie } from "../cookie"
import { type RegionConfig } from "./config"

const preferenceCookie = "jori_region"
const preferenceMaxAgeSeconds = 60 * 60 * 24 * 365

/** The region the visitor is treated as on the public origin, from a
 *  `Cookie` header on the server or `document.cookie` in the page. */
export function readRegionPreference(
  cookies: string | null,
  config: RegionConfig
) {
  const value = readCookie(cookies, preferenceCookie)

  return value !== undefined && isRegion(value) && config.enabled.has(value)
    ? value
    : undefined
}

/** Host-only on the public origin, and readable there: the page files
 *  the analytics choice under it. */
export function regionPreferenceHeader(region: Region, publicOrigin: string) {
  const secure = new URL(publicOrigin).protocol === "https:" ? "; Secure" : ""

  return `${preferenceCookie}=${region}; Path=/; SameSite=Lax; Max-Age=${preferenceMaxAgeSeconds}${secure}`
}

/** The choice as the page holds it, for the public origin: what the
 *  visitor picked here or the server pinned, and picking again keeps the
 *  same cookie and tells every reader in the page. */
const listeners = new Set<() => void>()

export function subscribeRegionChoice(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function readRegionChoice(config: RegionConfig) {
  return typeof document === "undefined"
    ? undefined
    : readRegionPreference(document.cookie, config)
}

export function saveRegionChoice(region: Region, config: RegionConfig) {
  // biome-ignore lint/suspicious/noDocumentCookie: The same first-party cookie the server pins, written where the choice is made.
  document.cookie = regionPreferenceHeader(region, config.publicOrigin)
  for (const listener of listeners) {
    listener()
  }
}
