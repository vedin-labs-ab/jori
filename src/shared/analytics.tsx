import { type Region } from "@contracts/region"
import { useRouterState } from "@tanstack/react-router"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { type AnalyticsInstance, analyticsConfig } from "./analytics/config"
import { clearAnalyticsStorage } from "./analytics/consent"
import { usePrivacyChoices } from "./analytics/context"
import { PrivacyProvider } from "./analytics/preferences"
import { analyticsPage } from "./analytics/privacy"
import { regionConfig, requireRegionOrigin } from "./region/config"
import { readRegionPreference } from "./region/preference"

const configuration = analyticsConfig(import.meta.env, regionConfig.enabled)

/** Share the lazy SDK initialization across route changes and strict mode. */
let client: Promise<typeof import("posthog-js").default> | undefined
let initialized: typeof import("posthog-js").default | undefined

function analyticsClient() {
  client ??= import("posthog-js").then(({ default: posthog }) => {
    return posthog
  })
  return client
}

/** The region a page's analytics belong to: a regional host's own, and on
 *  the public origin the one the visitor is treated as. Anywhere else, and
 *  before the public origin has pinned one, there is none. */
function analyticsRegion(): Region | undefined {
  if (typeof window === "undefined") {
    return undefined
  }
  const origin = window.location.origin
  if (origin === requireRegionOrigin(regionConfig, regionConfig.current)) {
    return regionConfig.current
  }
  return origin === regionConfig.publicOrigin
    ? readRegionPreference(document.cookie, regionConfig)
    : undefined
}

/** Explicit page usage only, on a production origin. Router definitions
 * supply categories, never customer content or browser URLs. */
export function Analytics({ children }: { children: ReactNode }) {
  const [region] = useState(analyticsRegion)
  const instance = region === undefined ? undefined : configuration?.[region]
  return (
    <PrivacyProvider region={instance === undefined ? undefined : region}>
      <PageAnalytics instance={instance}>{children}</PageAnalytics>
    </PrivacyProvider>
  )
}

function PageAnalytics({
  children,
  instance,
}: {
  children: ReactNode
  instance: AnalyticsInstance | undefined
}) {
  const privacy = usePrivacyChoices()
  const routeId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  })
  const lastRoute = useRef<string | undefined>(undefined)
  useEffect(() => {
    // Wait for the saved choice before touching existing analytics storage.
    if (instance === undefined || privacy === undefined) {
      return
    }
    const page = analyticsPage(routeId)
    if (privacy.choice !== "accepted" || page === undefined) {
      lastRoute.current = undefined
      initialized?.opt_out_capturing()
      if (privacy.choice !== "accepted") {
        clearAnalyticsStorage(instance.key)
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
          posthog.init(instance.key, instance.options)
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
  }, [routeId, privacy, instance])

  return children
}
