import { type ReactNode, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { BrandIcon } from "@/shared/brand"
import { reportWebsiteStartError } from "../context/organization/discovery/url"
import {
  DiscoveryWorkingStep,
  WebsiteDiscoveryStep,
} from "../context/organization/discovery/website"
import { type OrganizationDiscovery } from "../context/organization/types"
import { DetailsStep } from "./details"
import { DoneStep } from "./done"
import { NameStep } from "./name"
import { OnboardingStep } from "./step"

const steps = ["name", "details", "website", "working", "done"] as const

type Step = (typeof steps)[number]

type Props = {
  /** The organization's discovery run, or null before there is one. */
  discovery: OrganizationDiscovery
  /** Shown under the name step: the other way into Jori, by invitation. */
  invitations?: ReactNode
  /** The logo field, bound to the organization being onboarded. */
  logo: ReactNode
  /** What to call the person, when the session knows. */
  name: string | undefined
  /** Backs out of a new organization, when there is one to go back to. */
  onCancel?: () => void
  onCreate: (organization: string) => Promise<void>
  onDeclareTimezone: (timezone: string) => Promise<void>
  onDiscover: (website: string) => Promise<void>
  /** Leaves onboarding for the console, at the profile when there is one to review. */
  onFinish: (destination?: "/context") => void
  /** The organization being onboarded, by name, once it exists. */
  organization: string | undefined
  /** The organization's declared zone, once it has one. */
  timezone: string | undefined
}

/** The onboarding sequence, one ask per step: the organization's name, its
 *  logo and timezone, its website, Jori reading it, then the way into the
 *  console. Creating the
 *  organization remounts the flow, so the step shown first is read from what
 *  the organization already has, and a reload never asks twice.
 *
 *  Props in, callbacks out: the console binds it to the session and Convex. */
export function OnboardingFlow(props: Props) {
  const [step, setStep] = useState<Step>(() => firstStep(props))
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
          {step === "name" ? (
            <NameStep
              name={props.name}
              onCancel={props.onCancel}
              onCreate={props.onCreate}
            />
          ) : null}
          {step === "details" ? (
            <DetailsStep
              logo={props.logo}
              onContinue={async (timezone) => {
                await props.onDeclareTimezone(timezone)
                setStep("website")
              }}
            />
          ) : null}
          {step === "website" ? (
            <WebsiteStep
              onDiscover={props.onDiscover}
              onDone={() => setStep("working")}
              onSkip={() => setStep("done")}
              organization={props.organization}
            />
          ) : null}
          {step === "working" ? (
            <DiscoveryWorkingStep
              discovery={props.discovery}
              layout={OnboardingStep}
              leaveLabel="Continue"
              onClose={() => setStep("done")}
            />
          ) : null}
          {step === "done" ? (
            <DoneStep
              onChat={() => props.onFinish()}
              onReview={
                props.discovery === null
                  ? undefined
                  : () => props.onFinish("/context")
              }
              organization={props.organization ?? "Your organization"}
            />
          ) : null}
        </div>
        {step === "name" ? props.invitations : null}
      </div>
    </div>
  )
}

function firstStep({ discovery, organization, timezone }: Props): Step {
  if (organization === undefined) {
    return "name"
  }

  if (discovery !== null) {
    return "working"
  }

  return timezone === undefined ? "details" : "website"
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
