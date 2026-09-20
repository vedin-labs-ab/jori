import { Loader2 } from "lucide-react"
import { type ComponentType, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { scrollFade } from "@/shared/fade"
import { type OrganizationDiscovery } from "../types"
import { DiscoveryProgress } from "./progress"
import { discoveryFailed, discoveryReadyForReview } from "./progress/tasks"

/** Where a discovery step is drawn. The steps own their fields, copy, and
 *  buttons; the layout places them, in a dialog on the context page and on
 *  the page itself during onboarding. */
export type DiscoveryStepLayout = ComponentType<{
  title: string
  description: string
  children: ReactNode
  primary: ReactNode
  secondary?: ReactNode
}>

const DialogStep: DiscoveryStepLayout = ({
  title,
  description,
  children,
  primary,
  secondary,
}) => (
  <>
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
    {children}
    <DialogFooter>
      {secondary}
      {primary}
    </DialogFooter>
  </>
)

export function WebsiteDiscoveryStep({
  continueLabel = "Continue",
  description,
  error,
  inputId,
  isSubmitting,
  layout: Layout = DialogStep,
  onContinue,
  onSkip,
  onWebsiteChange,
  skipLabel = "Skip",
  title,
  validationError = null,
  website,
}: {
  continueLabel?: string
  description: string
  error: string | null
  inputId: string
  isSubmitting: boolean
  layout?: DiscoveryStepLayout
  onContinue: () => void
  onSkip: () => void
  onWebsiteChange: (value: string) => void
  skipLabel?: string
  title: string
  validationError?: string | null
  website: string
}) {
  const fieldError = validationError ?? error
  const errorId = `${inputId}-error`
  const canSubmit =
    !isSubmitting && website.trim() !== "" && validationError === null

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()

        if (canSubmit) {
          onContinue()
        }
      }}
    >
      <Layout
        description={description}
        primary={
          <Button disabled={!canSubmit} type="submit">
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            {continueLabel}
          </Button>
        }
        secondary={
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={isSubmitting}
            type="button"
          >
            {skipLabel}
          </Button>
        }
        title={title}
      >
        <div className="grid gap-2 py-1">
          <Label htmlFor={inputId}>Website</Label>
          <Input
            aria-describedby={fieldError === null ? undefined : errorId}
            aria-invalid={fieldError === null ? undefined : true}
            autoFocus
            id={inputId}
            value={website}
            onChange={(event) => onWebsiteChange(event.target.value)}
            placeholder="yourcompany.com"
            disabled={isSubmitting}
          />
          <FieldError id={errorId}>{fieldError}</FieldError>
        </div>
      </Layout>
    </form>
  )
}

export function DiscoveryWorkingStep({
  discovery,
  layout: Layout = DialogStep,
  leaveLabel,
  onClose,
  onReviewProfile,
}: {
  discovery: OrganizationDiscovery | undefined
  layout?: DiscoveryStepLayout
  /** How this host names moving on once discovery has ended. While it
   *  runs there is no way past it: a dialog can still be closed, and
   *  onboarding waits for what it started. */
  leaveLabel?: string
  onClose: () => void
  onReviewProfile?: () => void
}) {
  const ready = discoveryReadyForReview(discovery)
  const failed = discoveryFailed(discovery)
  const running =
    discovery === undefined ||
    discovery === null ||
    discovery.status === "running"
  const reviewable = ready && onReviewProfile !== undefined
  const starting =
    running &&
    (discovery === undefined ||
      discovery === null ||
      discovery.steps.length === 0)

  return (
    <Layout
      description={workingDescription(discovery)}
      primary={
        <Button
          disabled={running}
          onClick={reviewable ? onReviewProfile : onClose}
        >
          {running ? <Loader2 className="animate-spin" /> : null}
          {workingActionLabel({ failed, leaveLabel, ready, reviewable })}
        </Button>
      }
      title={workingTitle({ failed, ready })}
    >
      <div
        className={cn(
          scrollFade,
          "max-h-64 overflow-y-auto pr-1 [scrollbar-gutter:stable]"
        )}
      >
        {starting ? (
          <StartingExtraction />
        ) : (
          <DiscoveryProgress discovery={discovery} />
        )}
      </div>
    </Layout>
  )
}

function StartingExtraction() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-xs/relaxed">
      <Loader2 className="size-3.5 animate-spin" />
      <span>Starting extraction</span>
    </div>
  )
}

function workingTitle({ failed, ready }: { failed: boolean; ready: boolean }) {
  if (ready) {
    return "Your profile is ready to review"
  }

  if (failed) {
    return "We hit a snag"
  }

  return "Exploring your website"
}

function workingDescription(discovery: OrganizationDiscovery | undefined) {
  if (discoveryReadyForReview(discovery)) {
    return "Review and approve what Jori drafted from your site."
  }

  if (discoveryFailed(discovery)) {
    return discovery?.errors[0] ?? "Discovery didn't finish."
  }

  return "This usually takes under a minute."
}

function workingActionLabel({
  failed,
  leaveLabel,
  ready,
  reviewable,
}: {
  failed: boolean
  leaveLabel?: string
  ready: boolean
  reviewable: boolean
}) {
  if (reviewable) {
    return "Review profile"
  }

  if (failed) {
    return leaveLabel ?? "Close"
  }

  if (ready) {
    return leaveLabel ?? "Done"
  }

  return "Extracting"
}
