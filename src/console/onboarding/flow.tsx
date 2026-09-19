import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { BrandIcon } from "@/shared/brand"
import { reportWebsiteStartError } from "../context/organization/discovery/url"
import {
  DiscoveryWorkingStep,
  WebsiteDiscoveryStep,
} from "../context/organization/discovery/website"
import { type OrganizationDiscovery } from "../context/organization/types"
import { OnboardingStep } from "./step"
import { WelcomeStep } from "./welcome"

const steps = ["welcome", "website", "working"] as const

type Step = (typeof steps)[number]

/** The onboarding sequence, one ask per step: a welcome, the organization's
 *  website, then Jori reading it. An organization whose discovery already
 *  started opens on the last step, so a reload never asks twice.
 *
 *  Props in, callbacks out: the console binds it to the session and Convex. */
export function OnboardingFlow({
  discovery,
  name,
  onDiscover,
  onFinish,
  organization,
}: {
  /** The organization's discovery run, or null before there is one. */
  discovery: OrganizationDiscovery
  /** What to call the person, when the session knows. */
  name: string | undefined
  onDiscover: (website: string) => Promise<void>
  /** Leaves onboarding for the console, at the profile when there is one to review. */
  onFinish: (destination?: "/context") => void
  organization: string
}) {
  const [step, setStep] = useState<Step>(
    discovery === null ? "welcome" : "working"
  )
  const position = steps.indexOf(step) + 1

  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto p-6">
      <div className="m-auto grid w-full max-w-sm gap-8">
        <div className="flex items-center justify-between gap-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <BrandIcon className="size-5" />
          </span>
          <Progress
            aria-label={`Step ${position} of ${steps.length}`}
            className="w-16"
            value={(position / steps.length) * 100}
          />
        </div>
        <div
          className="motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:animate-in motion-safe:duration-300"
          key={step}
        >
          {step === "welcome" ? (
            <WelcomeStep
              name={name}
              onStart={() => setStep("website")}
              organization={organization}
            />
          ) : null}
          {step === "website" ? (
            <WebsiteStep
              onDiscover={onDiscover}
              onDone={() => setStep("working")}
              onSkip={() => onFinish()}
              organization={organization}
            />
          ) : null}
          {step === "working" ? (
            <DiscoveryWorkingStep
              discovery={discovery}
              layout={OnboardingStep}
              leaveLabel="Continue to Jori"
              onClose={() => onFinish()}
              onReviewProfile={() => onFinish("/context")}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function WebsiteStep({
  onDiscover,
  onDone,
  onSkip,
  organization,
}: {
  onDiscover: (website: string) => Promise<void>
  onDone: () => void
  onSkip: () => void
  organization: string
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
      description="Jori reads only your public pages to learn what you do and how you describe it. Every job they run starts from that."
      error={error}
      inputId="onboarding-website"
      isSubmitting={isSubmitting}
      layout={OnboardingStep}
      onContinue={() => void onContinue()}
      onSkip={onSkip}
      onWebsiteChange={setWebsite}
      skipLabel="I'll do this later"
      title={`What's ${organization}'s website?`}
      website={website}
    />
  )
}
