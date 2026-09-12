import { type Region } from "@contracts/region"
import { readCookie, siteCookieAttributes } from "../cookie"
import { regionConfig } from "../region/config"

export type AnalyticsChoice = "accepted" | "declined"

const consentLifetimeSeconds = 180 * 24 * 60 * 60

/** One choice per data region, kept in a cookie the public origin and the
 *  regional hosts all read, so a decision made on either holds on both. */
function consentCookie(region: Region) {
  return `jori_analytics_${region}`
}

export function readConsent(region: Region): AnalyticsChoice | undefined {
  const value = readCookie(document.cookie, consentCookie(region))

  return value === "accepted" || value === "declined" ? value : undefined
}

export function saveConsent(region: Region, choice: AnalyticsChoice) {
  // biome-ignore lint/suspicious/noDocumentCookie: A first-party preference, written synchronously so the choice applies in this frame.
  document.cookie = `${consentCookie(region)}=${choice}; ${siteCookieAttributes(regionConfig.publicOrigin, consentLifetimeSeconds)}`
}

/** Remove only this project's analytics identifiers, never sign-in storage. */
export function clearAnalyticsStorage(key: string) {
  const names = [
    `ph_${key}_posthog`,
    `ph_${key}_window_id`,
    `ph_${key}_primary_window_exists`,
  ]
  for (const name of names) {
    try {
      localStorage.removeItem(name)
    } catch {
      /* Storage can be blocked. */
    }
    try {
      sessionStorage.removeItem(name)
    } catch {
      /* Storage can be blocked. */
    }
    // biome-ignore lint/suspicious/noDocumentCookie: Clear host-only SDK cookies synchronously, including browsers without Cookie Store.
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
  }
}
