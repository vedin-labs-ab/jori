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
import { DiscoveryProgress } from "./progress"
import { type OrganizationDiscovery } from "./types"

export function WebsiteDiscoveryStep({
  continueLabel = "Continue",
  description,
  error,
  inputId,
  isSubmitting,
  onContinue,
  onSkip,
  onWebsiteChange,
  skipLabel = "Skip",
  title,
  website,
}: {
  continueLabel?: string
  description: string
  error: string | null
  inputId: string
  isSubmitting: boolean
  onContinue: () => void
  onSkip: () => void
  onWebsiteChange: (value: string) => void
  skipLabel?: string
  title: string
  website: string
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 py-1">
        <Label htmlFor={inputId}>Website</Label>
        <Input
          id={inputId}
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
          {skipLabel}
        </Button>
        <Button
          onClick={onContinue}
          disabled={isSubmitting || website.trim() === ""}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {continueLabel}
        </Button>
      </DialogFooter>
    </>
  )
}

export function DiscoveryWorkingStep({
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

  return "This usually takes under a minute. You can close this; it keeps going."
}
