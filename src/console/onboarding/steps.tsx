import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BrandIcon } from "@/shared/brand"
import { type OrganizationDiscovery } from "../context/types"
import { DiscoveryWorkingStep, WebsiteDiscoveryStep } from "../context/website"

export function WelcomeStep({
  onStart,
  onSkip,
}: {
  onStart: () => void
  onSkip: () => void
}) {
  return (
    <>
      <DialogHeader>
        <span className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
          <BrandIcon className="size-5" />
        </span>
        <DialogTitle>Welcome to Milo</DialogTitle>
        <DialogDescription>
          Milo works where your team already does. Point it at your website and
          it learns what your organization does for sharper, on-brand answers.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" onClick={onSkip}>
          Not now
        </Button>
        <Button onClick={onStart}>Get started</Button>
      </DialogFooter>
    </>
  )
}

export function WebsiteStep({
  website,
  isSubmitting,
  error,
  onWebsiteChange,
  onContinue,
  onSkip,
}: {
  website: string
  isSubmitting: boolean
  error: string | null
  onWebsiteChange: (value: string) => void
  onContinue: () => void
  onSkip: () => void
}) {
  return (
    <WebsiteDiscoveryStep
      description="Milo reads only your public site to learn your name, products, and how you describe yourselves."
      error={error}
      inputId="onboarding-website"
      isSubmitting={isSubmitting}
      onContinue={onContinue}
      onSkip={onSkip}
      onWebsiteChange={onWebsiteChange}
      title="What's your website?"
      website={website}
    />
  )
}

export function WorkingStep({
  discovery,
  onClose,
}: {
  discovery: OrganizationDiscovery | undefined
  onClose: () => void
}) {
  return <DiscoveryWorkingStep discovery={discovery} onClose={onClose} />
}
