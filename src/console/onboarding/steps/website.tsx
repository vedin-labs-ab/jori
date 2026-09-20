import { useState } from "react"
import { reportWebsiteStartError } from "../../context/organization/discovery/url"
import { WebsiteDiscoveryStep } from "../../context/organization/discovery/website"
import { OnboardingStep } from "./layout"

/** The one thing Jori asks to read: the organization's public website. */
export function WebsiteStep({
  onDiscover,
  onDone,
  onSkip,
  organization,
}: {
  onDiscover: (website: string) => Promise<void>
  onDone: () => void
  onSkip: () => void
  organization: string | undefined
}) {
  const [website, setWebsite] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onContinue = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      await onDiscover(website.trim())
      onDone()
    } catch (caught) {
      reportWebsiteStartError(caught, setError)
      setIsSubmitting(false)
    }
  }

  return (
    <WebsiteDiscoveryStep
      description="Jori reads only your public pages to learn what you do and how you describe it. Every job Jori runs starts from that."
      error={error}
      inputId="onboarding-website"
      isSubmitting={isSubmitting}
      layout={OnboardingStep}
      onContinue={() => void onContinue()}
      onSkip={onSkip}
      onWebsiteChange={setWebsite}
      skipLabel="I'll do this later"
      title={
        organization === undefined
          ? "What's your website?"
          : `What's ${organization}'s website?`
      }
      website={website}
    />
  )
}
