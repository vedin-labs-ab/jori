import { type Region } from "@contracts/region"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { type AnalyticsChoice, readConsent, saveConsent } from "./consent"

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
