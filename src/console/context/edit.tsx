import { useAction } from "convex/react"
import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { parseWebsiteAddress } from "../../../contracts/website"
import { api } from "../../../convex/_generated/api"
import { type OrganizationDiscovery } from "./types"
import { websiteDomainKey } from "./url"
import { DiscoveryWorkingStep, WebsiteDiscoveryStep } from "./website"

type OrganizationEditDialogProps = {
  tenantId: string
  website: string | undefined
  discovery: OrganizationDiscovery | undefined
  onOpenChange: (open: boolean) => void
  onReviewProfile: () => void
}

export function OrganizationEditDialog({
  tenantId,
  website,
  discovery,
  onOpenChange,
  onReviewProfile,
}: OrganizationEditDialogProps) {
  const discover = useAction(api.organization.onboarding.discover)
  const [step, setStep] = useState<"website" | "working">(
    discovery?.status === "running" ? "working" : "website"
  )
  const [value, setValue] = useState(website ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showValidationError, setShowValidationError] = useState(false)
  const [pendingStartedAt, setPendingStartedAt] = useState<number | null>(null)
  const validationError = websiteValidationError(value, website)
  const visibleValidationError = showValidationError ? validationError : null
  const normalizedWebsite = parseWebsiteAddress(value)?.href ?? null
  const workingDiscovery = visibleDiscovery(discovery, pendingStartedAt)
  const close = () => onOpenChange(false)

  const onContinue = async () => {
    if (validationError !== null || normalizedWebsite === null) {
      setShowValidationError(true)
      return
    }

    setSubmitting(true)
    setError(null)
    setPendingStartedAt(discovery?.startedAt ?? null)

    try {
      await discover({ tenantId, website: normalizedWebsite })
      setStep("working")
    } catch (caught) {
      setError(discoveryStartError(caught))
      setPendingStartedAt(null)
    } finally {
      setSubmitting(false)
    }
  }

  const onWebsiteChange = (next: string) => {
    setValue(next)
    setError(null)
    setShowValidationError(false)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "website" ? (
          <WebsiteEditStep
            error={error}
            onClose={close}
            onContinue={onContinue}
            onWebsiteChange={onWebsiteChange}
            submitting={submitting}
            validationError={visibleValidationError}
            website={value}
          />
        ) : (
          <DiscoveryWorkingStep
            discovery={workingDiscovery}
            onClose={close}
            onReviewProfile={onReviewProfile}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function WebsiteEditStep({
  error,
  onClose,
  onContinue,
  onWebsiteChange,
  submitting,
  validationError,
  website,
}: {
  error: string | null
  onClose: () => void
  onContinue: () => Promise<void>
  onWebsiteChange: (value: string) => void
  submitting: boolean
  validationError: string | null
  website: string
}) {
  return (
    <WebsiteDiscoveryStep
      continueLabel="Run extraction"
      description="Change the main website Milo uses, then rerun extraction to draft updated organization facts."
      error={error}
      inputId="context-website"
      isSubmitting={submitting}
      onContinue={() => void onContinue()}
      onSkip={onClose}
      onWebsiteChange={onWebsiteChange}
      skipLabel="Cancel"
      title="Edit main website"
      validationError={validationError}
      website={website}
    />
  )
}

function websiteValidationError(value: string, current: string | undefined) {
  if (value.trim() === "") {
    return null
  }

  const next = parseWebsiteAddress(value)

  if (next === null) {
    return "Enter a public website, like example.com."
  }

  const currentKey = websiteDomainKey(current)

  if (currentKey === null || currentKey !== next.key) {
    return null
  }

  return "Enter a different website domain to run a new extraction."
}

function visibleDiscovery(
  discovery: OrganizationDiscovery | undefined,
  pendingStartedAt: number | null
) {
  if (pendingStartedAt === null || discovery?.startedAt !== pendingStartedAt) {
    return discovery
  }

  return undefined
}

function discoveryStartError(caught: unknown) {
  if (
    caught instanceof Error &&
    caught.message.includes("website must target a public website")
  ) {
    return "Enter a public website, like example.com."
  }

  return "Couldn't start extraction."
}
