import { type ReactNode, useState } from "react"
import { type BrandMood } from "@/shared/brand"
import { reportWebsiteStartError } from "../context/organization/discovery/url"
import {
  DiscoveryWorkingStep,
  WebsiteDiscoveryStep,
} from "../context/organization/discovery/website"
import {
  type ContextProposal,
  type OrganizationDiscovery,
} from "../context/organization/types"
import { DetailsStep } from "./details"
import { DoneStep } from "./done"
import { NameStep } from "./name"
import { ProfileStep } from "./profile"
import { OnboardingStage } from "./stage"
import { OnboardingStep } from "./step"
import { type OnboardingStepName, onboardingSteps } from "./steps"

type Step = OnboardingStepName

type Props = {
  /** The organization's discovery run, or null before there is one. */
  discovery: OrganizationDiscovery
  /** Shown under the name step: the other way into Jori, by invitation. */
  invitations?: ReactNode
  /** The logo field, bound to the organization being onboarded. */
  logo: ReactNode
  /** What to call the person, when the session knows. */
  name: string | undefined
  /** Keeps what Jori drafted, with the person's corrections. */
  onApprove: (edits: { name: string; summary: string }) => Promise<void>
  /** Backs out of a new organization, when there is one to go back to. */
  onCancel?: () => void
  onCreate: (organization: string) => Promise<void>
  onDeclareTimezone: (timezone: string) => Promise<void>
  onDiscover: (website: string) => Promise<void>
  /** Leaves onboarding for the console: a chat, or the integrations. */
  onFinish: (destination?: "/integrations") => void
  /** The organization being onboarded, by name, once it exists. */
  organization: string | undefined
  /** What Jori drafted from the website, while it waits to be reviewed. */
  proposal: ContextProposal | undefined
  /** The organization's declared zone, once it has one. */
  timezone: string | undefined
}

/** The onboarding sequence, one ask per step: the organization's name, its
 *  logo and timezone, its website, Jori reading it, what Jori drafted from
 *  it, then the way into the console. It stays mounted from the first step
 *  to the last; the step it opens on is read from what the organization
 *  already has, so a reload never asks twice.
 *
 *  Props in, callbacks out: the console binds it to the session and Convex. */
export function OnboardingFlow(props: Props) {
  const [step, setStep] = useState<Step>(() => firstStep(props))

  return (
    <OnboardingStage
      footer={step === "name" ? props.invitations : undefined}
      mood={moodOf(step, props.discovery)}
      position={onboardingSteps.indexOf(step) + 1}
      stepKey={step}
      total={onboardingSteps.length}
    >
      {step === "name" || step === "details" || step === "website" ? (
        <SetupStep {...props} onStep={setStep} step={step} />
      ) : (
        <ClosingStep {...props} onStep={setStep} step={step} />
      )}
    </OnboardingStage>
  )
}

/** What the organization is asked about itself. */
function SetupStep({
  onStep,
  step,
  ...props
}: Props & {
  onStep: (step: Step) => void
  step: "name" | "details" | "website"
}) {
  if (step === "name") {
    return (
      <NameStep
        name={props.name}
        onCancel={props.onCancel}
        onCreate={async (organization) => {
          await props.onCreate(organization)
          onStep("details")
        }}
      />
    )
  }

  if (step === "details") {
    return (
      <DetailsStep
        logo={props.logo}
        onContinue={async (timezone) => {
          await props.onDeclareTimezone(timezone)
          onStep("website")
        }}
      />
    )
  }

  return (
    <WebsiteStep
      onDiscover={props.onDiscover}
      onDone={() => onStep("working")}
      onSkip={() => onStep("done")}
      organization={props.organization}
    />
  )
}

/** What Jori does with the answer: reads the site, shows what came of it,
 *  and hands the organization over. A draft is reviewed where it was made;
 *  with none, the flow closes. */
function ClosingStep({
  onStep,
  step,
  ...props
}: Props & {
  onStep: (step: Step) => void
  step: "working" | "profile" | "done"
}) {
  const { proposal } = props
  const organization = props.organization ?? "Your organization"

  if (step === "working") {
    return (
      <DiscoveryWorkingStep
        discovery={props.discovery}
        layout={OnboardingStep}
        leaveLabel="Continue"
        onClose={() => onStep("done")}
        onReviewProfile={
          proposal === undefined ? undefined : () => onStep("profile")
        }
      />
    )
  }

  if (step === "profile" && proposal !== undefined) {
    return (
      <ProfileStep
        onApprove={async (edits) => {
          await props.onApprove(edits)
          onStep("done")
        }}
        onSkip={() => onStep("done")}
        organization={organization}
        proposal={proposal}
      />
    )
  }

  return (
    <DoneStep
      onChat={() => props.onFinish()}
      onIntegrations={() => props.onFinish("/integrations")}
      organization={organization}
    />
  )
}

/** The mark works while Jori reads, and settles once there is nothing left
 *  to ask. */
function moodOf(step: Step, discovery: OrganizationDiscovery): BrandMood {
  if (step === "done") {
    return "done"
  }

  return step === "working" && discovery?.status === "running"
    ? "working"
    : "idle"
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
