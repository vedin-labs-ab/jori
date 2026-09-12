import { createContext, useContext, useEffect, useRef, useState } from "react"
import {
  type AnalyticsChoice,
  consentKey,
  readConsent,
  saveConsent,
} from "./consent"

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

export function useAnalyticsConsent() {
  const [choice, setChoice] = useState<AnalyticsChoice>()
  const [ready, setReady] = useState(false)
  const current = useRef<AnalyticsChoice>(undefined)
  useEffect(() => {
    function refresh() {
      current.current = readConsent()
      setChoice(current.current)
      setReady(true)
    }
    function changed(event: StorageEvent) {
      if (event.key === consentKey || event.key === null) {
        refresh()
      }
    }
    refresh()
    window.addEventListener("storage", changed)
    window.addEventListener("focus", refresh)
    return () => {
      window.removeEventListener("storage", changed)
      window.removeEventListener("focus", refresh)
    }
  }, [])
  return {
    choice,
    ready,
    allowsAnalytics: () => current.current === "accepted",
    choose: (value: AnalyticsChoice) => {
      current.current = value
      saveConsent(value)
      setChoice(value)
    },
  }
}
