import { type Region } from "@contracts/region"
import { useRouterState } from "@tanstack/react-router"
import { type ReactNode, useEffect, useRef } from "react"
import { type AnalyticsInstance, analyticsConfig } from "./analytics/config"
import { clearAnalyticsStorage } from "./analytics/consent"
import { usePrivacyChoices } from "./analytics/context"
import { PrivacyProvider } from "./analytics/preferences"
import { analyticsPage } from "./analytics/privacy"
import { useRegionChoice } from "./region/choice"
import { regionConfig, requireRegionOrigin } from "./region/config"

const configuration = analyticsConfig(import.meta.env, regionConfig.enabled)

/** Share the lazy SDK initialization across route changes and strict mode.
 *  The SDK initializes once per page, for one instance: should the choice
 *  move to another region afterwards, capture stops until the next load
 *  rather than send anything to the wrong instance. */
let client: Promise<typeof import("posthog-js").default> | undefined
let initialized:
  | { key: string; posthog: typeof import("posthog-js").default }
  | undefined

function analyticsClient() {
  client ??= import("posthog-js").then(({ default: posthog }) => {
    return posthog
  })
  return client
}

/** The region a page's analytics belong to: a regional host's own, and on
 *  the public origin the one the visitor chose or was pinned. Anywhere
 *  else, and before either, there is none. */
function analyticsRegion(choice: Region | undefined): Region | undefined {
  if (typeof window === "undefined") {
    return undefined
  }
  const origin = window.location.origin
  if (origin === requireRegionOrigin(regionConfig, regionConfig.current)) {
    return regionConfig.current
  }
  return origin === regionConfig.publicOrigin ? choice : undefined
}

/** Explicit page usage only, on a production origin. Router definitions
 * supply categories, never customer content or browser URLs. */
export function Analytics({ children }: { children: ReactNode }) {
  const region = analyticsRegion(useRegionChoice())
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
    if (
      privacy.choice !== "accepted" ||
      page === undefined ||
      (initialized !== undefined && initialized.key !== instance.key)
    ) {
      lastRoute.current = undefined
      initialized?.posthog.opt_out_capturing()
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
          initialized = { key: instance.key, posthog }
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
