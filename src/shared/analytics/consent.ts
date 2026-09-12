export type AnalyticsChoice = "accepted" | "declined"
export const consentKey = "jori.analytics.v1"
const consentLifetime = 180 * 24 * 60 * 60 * 1000

export function readConsent(): AnalyticsChoice | undefined {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(consentKey) ?? "null"
    )
    if (stored === null || typeof stored !== "object") {
      return undefined
    }
    if (!("choice" in stored) || !("expires" in stored)) {
      return undefined
    }
    if (typeof stored.expires !== "number" || stored.expires <= Date.now()) {
      return undefined
    }
    return stored.choice === "accepted" || stored.choice === "declined"
      ? stored.choice
      : undefined
  } catch {
    return undefined
  }
}

export function saveConsent(choice: AnalyticsChoice) {
  try {
    localStorage.setItem(
      consentKey,
      JSON.stringify({
        choice,
        expires: Date.now() + consentLifetime,
      })
    )
  } catch {
    // The choice still applies in this tab when storage is unavailable.
  }
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
