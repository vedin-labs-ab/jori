import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BrandIcon } from "@/shared/brand"
import { DiscoveryProgress } from "../context/progress"
import { type OrganizationDiscovery } from "../context/types"

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
          it learns what your organization does — for sharper, on-brand answers.
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
    <>
      <DialogHeader>
        <DialogTitle>What&apos;s your website?</DialogTitle>
        <DialogDescription>
          Milo reads only your public site to learn your name, products, and how
          you describe yourselves.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 py-1">
        <Label htmlFor="onboarding-website">Website</Label>
        <Input
          id="onboarding-website"
          value={website}
          onChange={(event) => onWebsiteChange(event.target.value)}
          placeholder="yourcompany.com"
          disabled={isSubmitting}
        />
        {error === null ? null : (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onSkip} disabled={isSubmitting}>
          Skip
        </Button>
        <Button
          onClick={onContinue}
          disabled={isSubmitting || website.trim() === ""}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Continue
        </Button>
      </DialogFooter>
    </>
  )
}

export function WorkingStep({
  discovery,
  onClose,
}: {
  discovery: OrganizationDiscovery | undefined
  onClose: () => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{workingTitle(discovery?.status)}</DialogTitle>
        <DialogDescription>{workingDescription(discovery)}</DialogDescription>
      </DialogHeader>
      <div className="max-h-64 overflow-y-auto py-1">
        <DiscoveryProgress discovery={discovery} />
      </div>
      <DialogFooter>
        <Button onClick={onClose}>
          {discovery?.status === "succeeded" ? "Review profile" : "Close"}
        </Button>
      </DialogFooter>
    </>
  )
}

function workingTitle(status: string | undefined) {
  if (status === "succeeded") {
    return "Your profile is ready to review"
  }

  if (status === "failed") {
    return "We hit a snag"
  }

  return "Exploring your website"
}

function workingDescription(discovery: OrganizationDiscovery | undefined) {
  if (discovery?.status === "succeeded") {
    return "Review and approve what Milo drafted from your site."
  }

  if (discovery?.status === "failed") {
    return discovery.error ?? "Discovery didn't finish."
  }

  return "This usually takes under a minute. You can close this — it keeps going."
}
