import { type ReactNode, useState } from "react"
import { type BrandMood } from "@/shared/brand"
import { DiscoveryWorkingStep } from "../context/organization/discovery/website"
import {
  type ContextProposal,
  type OrganizationDiscovery,
} from "../context/organization/types"
import { OnboardingStage } from "./stage"
import { type OnboardingStepName, onboardingSteps } from "./steps"
import { DetailsStep } from "./steps/details"
import { DoneStep } from "./steps/done"
import { OnboardingStep } from "./steps/layout"
import { NameStep } from "./steps/name"
import { PlanConfirmingStep, PlanStep } from "./steps/plan"
import { ProfileStep } from "./steps/profile"
import { WebsiteStep } from "./steps/website"

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
  /** Leaves for the plan's checkout. */
  onSubscribe: () => Promise<void>
  /** The organization being onboarded, by name, once it exists. */
  organization: string | undefined
  /** Where the plan stands: still to be bought, paid for and waiting on
   *  Polar's word, or settled, because the organization has one or this
   *  instance sells none. */
  plan: "open" | "confirming" | "settled"
  /** What Jori drafted from the website, while it waits to be reviewed. */
  proposal: ContextProposal | undefined
  /** Whether the person is back from checkout, which reopens on the plan. */
  returned?: boolean
  /** The organization's declared zone, once it has one. */
  timezone: string | undefined
}

/** The onboarding sequence, one ask per step: the organization's name, its
 *  logo and timezone, its website, Jori reading it, what Jori drafted from
 *  it, the plan, then the way into the console. It stays mounted from the first step
 *  to the last; the step it opens on is read from what the organization
 *  already has, so a reload never asks twice.
 *
 *  Props in, callbacks out: the console binds it to the session and Convex. */
export function OnboardingFlow(props: Props) {
  const [asked, setStep] = useState<Step>(() => firstStep(props))
  // A settled plan is never asked for, and one that settles while it is on
  // screen moves the flow on by itself.
  const step = asked === "plan" && props.plan === "settled" ? "done" : asked

  return (
    <OnboardingStage
      footer={step === "name" ? props.invitations : undefined}
      mood={moodOf(step, props)}
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
      onSkip={() => onStep("plan")}
      organization={props.organization}
    />
  )
}

/** What Jori does with the answer: reads the site, shows what came of it,
 *  asks for the plan, and hands the organization over. A draft is reviewed
 *  where it was made. */
function ClosingStep({
  onStep,
  step,
  ...props
}: Props & {
  onStep: (step: Step) => void
  step: "working" | "profile" | "plan" | "done"
}) {
  const { proposal } = props
  const organization = props.organization ?? "Your organization"

  if (step === "working") {
    return (
      <DiscoveryWorkingStep
        discovery={props.discovery}
        layout={OnboardingStep}
        leaveLabel="Continue"
        onClose={() => onStep("plan")}
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
          onStep("plan")
        }}
        onSkip={() => onStep("plan")}
        organization={organization}
        proposal={proposal}
      />
    )
  }

  if (step === "plan") {
    return props.plan === "confirming" ? (
      <PlanConfirmingStep onContinue={() => onStep("done")} />
    ) : (
      <PlanStep onSubscribe={props.onSubscribe} organization={organization} />
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

/** The mark works while Jori reads and while a payment is confirmed, and
 *  settles once there is nothing left to ask. */
function moodOf(step: Step, { discovery, plan }: Props): BrandMood {
  if (step === "done") {
    return "done"
  }

  const waiting =
    step === "working"
      ? discovery?.status === "running"
      : step === "plan" && plan === "confirming"

  return waiting ? "working" : "idle"
}

function firstStep(props: Props): Step {
  const { discovery, organization, timezone } = props

  if (organization === undefined) {
    return "name"
  }

  if (props.returned) {
    return "plan"
  }

  if (discovery !== null) {
    return "working"
  }

  return timezone === undefined ? "details" : "website"
}
