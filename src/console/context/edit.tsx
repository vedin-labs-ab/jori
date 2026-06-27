import { useAction } from "convex/react"
import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { api } from "../../../convex/_generated/api"
import { type OrganizationDiscovery } from "./types"
import { websiteDomainKey } from "./url"
import { DiscoveryWorkingStep, WebsiteDiscoveryStep } from "./website"

export function OrganizationEditDialog({
  tenantId,
  website,
  discovery,
  onOpenChange,
}: {
  tenantId: string
  website: string | undefined
  discovery: OrganizationDiscovery | undefined
  onOpenChange: (open: boolean) => void
}) {
  const discover = useAction(api.organization.onboarding.discover)
  const [step, setStep] = useState<"website" | "working">(
    discovery?.status === "running" ? "working" : "website"
  )
  const [value, setValue] = useState(website ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingStartedAt, setPendingStartedAt] = useState<number | null>(null)
  const validationError = websiteValidationError(value, website)
  const workingDiscovery =
    pendingStartedAt === null || discovery?.startedAt !== pendingStartedAt
      ? discovery
      : undefined

  const onContinue = async () => {
    if (validationError !== null) {
      return
    }

    setSubmitting(true)
    setError(null)
    setPendingStartedAt(discovery?.startedAt ?? null)

    try {
      await discover({ tenantId, website: value.trim() })
      setStep("working")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't start.")
      setPendingStartedAt(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "website" ? (
          <WebsiteDiscoveryStep
            continueLabel="Run extraction"
            description="Change the main website Milo uses, then rerun extraction to draft updated organization facts."
            error={error}
            inputId="context-website"
            isSubmitting={submitting}
            onContinue={() => void onContinue()}
            onSkip={() => onOpenChange(false)}
            onWebsiteChange={(next) => {
              setValue(next)
              setError(null)
            }}
            skipLabel="Cancel"
            title="Edit main website"
            validationError={validationError}
            website={value}
          />
        ) : (
          <DiscoveryWorkingStep
            discovery={workingDiscovery}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function websiteValidationError(value: string, current: string | undefined) {
  if (value.trim() === "") {
    return null
  }

  const currentKey = websiteDomainKey(current)
  const nextKey = websiteDomainKey(value)

  if (currentKey === null || nextKey === null || currentKey !== nextKey) {
    return null
  }

  return "Enter a different website domain to run a new extraction."
}
