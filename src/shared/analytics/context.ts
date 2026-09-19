import { type Region } from "@contracts/region"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { type AnalyticsChoice, readConsent, saveConsent } from "./consent"
import { type AnalyticsEvent, type EventProperties } from "./events"

type PrivacyContextValue = {
  choice: AnalyticsChoice | undefined
  allowsAnalytics: () => boolean
  open: () => void
}
export const PrivacyContext = createContext<PrivacyContextValue | undefined>(
  undefined
)

export function usePrivacyChoices() {
  return useContext(PrivacyContext)
}

export type Capture = <E extends AnalyticsEvent>(
  event: E,
  properties: EventProperties<E>
) => void

export const CaptureContext = createContext<Capture>(() => {
  /* Outside the provider nothing is configured, so nothing is sent. */
})

/** Record one event from the contract. It is sent only when the visitor
 *  accepted analytics and this deployment configures it, so callers never
 *  check either. */
export function useCapture() {
  return useContext(CaptureContext)
}

/** The choice for one region; without a region there is nothing to ask.
 *  Another tab may change it, so it is read again when this one returns. */
export function useAnalyticsConsent(region: Region | undefined) {
  const [choice, setChoice] = useState<AnalyticsChoice>()
  const [ready, setReady] = useState(false)
  const current = useRef<AnalyticsChoice>(undefined)
  useEffect(() => {
    if (region === undefined) {
      return
    }
    function refresh() {
      current.current = readConsent(region as Region)
      setChoice(current.current)
      setReady(true)
    }
    refresh()
    window.addEventListener("focus", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
    }
  }, [region])
  return {
    choice,
    ready,
    allowsAnalytics: () => current.current === "accepted",
    choose: (value: AnalyticsChoice) => {
      if (region === undefined) {
        return
      }
      current.current = value
      saveConsent(region, value)
      setChoice(value)
    },
  }
}
