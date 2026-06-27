import { Loader2 } from "lucide-react"
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
  validationError = null,
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
  validationError?: string | null
  website: string
}) {
  const fieldError = validationError ?? error
  const errorId = `${inputId}-error`

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 py-1">
        <Label htmlFor={inputId}>Website</Label>
        <Input
          aria-describedby={fieldError === null ? undefined : errorId}
          aria-invalid={fieldError === null ? undefined : true}
          id={inputId}
          value={website}
          onChange={(event) => onWebsiteChange(event.target.value)}
          placeholder="yourcompany.com"
          disabled={isSubmitting}
        />
        <FieldError id={errorId}>{fieldError}</FieldError>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onSkip} disabled={isSubmitting}>
          {skipLabel}
        </Button>
        <Button
          onClick={onContinue}
          disabled={
            isSubmitting || website.trim() === "" || validationError !== null
          }
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
      <div className="max-h-64 overflow-y-auto">
        {discovery === undefined || discovery === null ? (
          <StartingExtraction />
        ) : (
          <DiscoveryProgress discovery={discovery} />
        )}
      </div>
      <DialogFooter>
        <Button onClick={onClose}>
          {discovery?.status === "succeeded" ? "Review profile" : "Close"}
        </Button>
      </DialogFooter>
    </>
  )
}

function StartingExtraction() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-muted-foreground text-xs/relaxed">
      <Loader2 className="size-3.5 animate-spin" />
      <span>Starting extraction</span>
    </div>
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
