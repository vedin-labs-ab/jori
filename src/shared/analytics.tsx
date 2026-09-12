import { useRouterState } from "@tanstack/react-router"
import { type ReactNode, useEffect, useRef } from "react"
import { analyticsConfig } from "./analytics/config"
import { clearAnalyticsStorage } from "./analytics/consent"
import { usePrivacyChoices } from "./analytics/context"
import { PrivacyProvider } from "./analytics/preferences"
import { analyticsPage } from "./analytics/privacy"
import { regionConfig, requireRegionOrigin } from "./region/config"

const configuration = analyticsConfig(import.meta.env, regionConfig.current)
const origin = requireRegionOrigin(regionConfig, regionConfig.current)

/** Share the lazy SDK initialization across route changes and strict mode. */
let client: Promise<typeof import("posthog-js").default> | undefined
let initialized: typeof import("posthog-js").default | undefined

function analyticsClient() {
  client ??= import("posthog-js").then(({ default: posthog }) => {
    return posthog
  })
  return client
}

/** Explicit page usage only, on the matching production origin. Router
 * definitions supply categories, never customer content or browser URLs. */
export function Analytics({ children }: { children: ReactNode }) {
  const enabled =
    configuration !== undefined &&
    typeof window !== "undefined" &&
    (window.location.origin === origin ||
      window.location.origin === regionConfig.publicOrigin)
  return (
    <PrivacyProvider enabled={enabled}>
      <PageAnalytics>{children}</PageAnalytics>
    </PrivacyProvider>
  )
}

function PageAnalytics({ children }: { children: ReactNode }) {
  const privacy = usePrivacyChoices()
  const routeId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  })
  const lastRoute = useRef<string | undefined>(undefined)
  useEffect(() => {
    // Wait for the saved choice before touching existing analytics storage.
    if (configuration === undefined || privacy === undefined) {
      return
    }
    const page = analyticsPage(routeId)
    if (
      privacy.choice !== "accepted" ||
      page === undefined ||
      (window.location.origin !== origin &&
        window.location.origin !== regionConfig.publicOrigin)
    ) {
      lastRoute.current = undefined
      initialized?.opt_out_capturing()
      if (privacy.choice !== "accepted") {
        clearAnalyticsStorage(configuration.key)
      }
      return
    }

    let cancelled = false
    void analyticsClient()
      .then((posthog) => {
        if (
          cancelled ||
          !privacy.allowsAnalytics() ||
          lastRoute.current === routeId
        ) {
          return
        }
        if (initialized === undefined) {
          posthog.init(configuration.key, configuration.options)
          initialized = posthog
        }
        posthog.opt_in_capturing({ captureEventName: false })
        lastRoute.current = routeId
        posthog.capture("$pageview", { page })
      })
      .catch(() => {
        // A blocked analytics script must not break the application.
        client = undefined
      })
    return () => {
      cancelled = true
    }
  }, [routeId, privacy])

  return children
}
