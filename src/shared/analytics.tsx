import { type Region } from "@contracts/region"
import { useRouterState } from "@tanstack/react-router"
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from "react"
import { type AnalyticsInstance, analyticsConfig } from "./analytics/config"
import { clearAnalyticsStorage } from "./analytics/consent"
import {
  type Capture,
  CaptureContext,
  usePrivacyChoices,
} from "./analytics/context"
import { type AnalyticsEvent, type EventProperties } from "./analytics/events"
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

/** Pages opened and features used, on a production origin. Events carry
 * router categories and contract properties, never customer content or
 * browser URLs. */
export function Analytics({ children }: { children: ReactNode }) {
  const region = analyticsRegion(useRegionChoice())
  const instance = region === undefined ? undefined : configuration?.[region]
  return (
    <PrivacyProvider region={instance === undefined ? undefined : region}>
      <EventAnalytics instance={instance}>{children}</EventAnalytics>
    </PrivacyProvider>
  )
}

type Current = {
  instance: AnalyticsInstance | undefined
  privacy: ReturnType<typeof usePrivacyChoices>
}

/** Consent and the instance are read once the SDK has loaded, so a choice
 *  withdrawn in the meantime still holds. Says whether the event left. */
async function send<E extends AnalyticsEvent>(
  current: RefObject<Current>,
  event: E,
  properties: EventProperties<E>
) {
  try {
    const posthog = await analyticsClient()
    const { instance, privacy } = current.current
    if (
      instance === undefined ||
      privacy?.allowsAnalytics() !== true ||
      (initialized !== undefined && initialized.key !== instance.key)
    ) {
      return false
    }
    if (initialized === undefined) {
      posthog.init(instance.key, instance.options)
      initialized = { key: instance.key, posthog }
    }
    posthog.opt_in_capturing({ captureEventName: false })
    posthog.capture(event, properties)
    return true
  } catch {
    // A blocked analytics script must not break the application.
    client = undefined
    return false
  }
}

function EventAnalytics({
  children,
  instance,
}: {
  children: ReactNode
  instance: AnalyticsInstance | undefined
}) {
  const privacy = usePrivacyChoices()
  // Read when an event fires, so the capture callers hold stays the same
  // function across renders.
  const current = useRef<Current>({ instance, privacy })
  current.current = { instance, privacy }
  usePageviews(current)

  const capture = useCallback<Capture>((event, properties) => {
    const { instance, privacy } = current.current
    // Without consent the SDK is never even loaded.
    if (instance !== undefined && privacy?.choice === "accepted") {
      void send(current, event, properties)
    }
  }, [])

  return <CaptureContext value={capture}>{children}</CaptureContext>
}

function usePageviews(current: RefObject<Current>) {
  const { instance, privacy } = current.current
  const routePath = useRouterState({
    select: (state) => state.matches.at(-1)?.fullPath,
  })
  const lastRoute = useRef<string | undefined>(undefined)
  useEffect(() => {
    // Wait for the saved choice before touching existing analytics storage.
    if (instance === undefined || privacy === undefined) {
      return
    }
    if (
      privacy.choice !== "accepted" ||
      (initialized !== undefined && initialized.key !== instance.key)
    ) {
      lastRoute.current = undefined
      initialized?.posthog.opt_out_capturing()
      if (privacy.choice !== "accepted") {
        clearAnalyticsStorage(instance.key)
      }
      return
    }
    const page = analyticsPage(routePath)
    if (page === undefined) {
      lastRoute.current = undefined
      return
    }
    if (lastRoute.current === routePath) {
      return
    }
    // Claimed before the SDK loads, so strict mode's second pass and later
    // renders of the same route do not count the page twice.
    lastRoute.current = routePath
    void send(current, "$pageview", { page }).then((sent) => {
      if (!sent && lastRoute.current === routePath) {
        lastRoute.current = undefined
      }
    })
  }, [routePath, privacy, instance, current])
}
