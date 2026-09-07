import { useRouterState } from "@tanstack/react-router"
import { type ReactNode, useEffect, useRef } from "react"
import { analyticsConfig } from "./analytics/config"
import { analyticsPage } from "./analytics/privacy"
import { regionConfig, requireRegionOrigin } from "./region/config"

const configuration = analyticsConfig(import.meta.env, regionConfig.current)
const origin = requireRegionOrigin(regionConfig, regionConfig.current)

/** Share the lazy SDK initialization across route changes and strict mode. */
let client: Promise<typeof import("posthog-js").default> | undefined

function analyticsClient() {
  client ??= import("posthog-js").then(({ default: posthog }) => {
    if (configuration !== undefined) {
      posthog.init(configuration.key, configuration.options)
    }
    return posthog
  })
  return client
}

/** Explicit page usage only, on the matching production origin. Router
 * definitions supply categories, never customer content or browser URLs. */
export function Analytics({ children }: { children: ReactNode }) {
  const routeId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  })
  const lastRoute = useRef<string | undefined>(undefined)
  useEffect(() => {
    const page = analyticsPage(routeId)
    if (
      configuration === undefined ||
      page === undefined ||
      (window.location.origin !== origin &&
        window.location.origin !== regionConfig.publicOrigin)
    ) {
      return
    }

    let cancelled = false
    void analyticsClient()
      .then((posthog) => {
        if (cancelled || lastRoute.current === routeId) {
          return
        }
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
  }, [routeId])

  return children
}
