import { useAction, useQuery } from "convex/react"
import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { api } from "../../../convex/_generated/api"
import { reportWebsiteStartError } from "../context/url"
import { WebsiteStep, WelcomeStep, WorkingStep } from "./steps"

type Step = "welcome" | "website" | "working"

export function OnboardingModal({
  tenantId,
  onClose,
}: {
  tenantId: string
  onClose: () => void
}) {
  const complete = useAction(api.organization.onboarding.complete)
  const discovery = useQuery(api.organization.discovery.get, { tenantId })
  const [step, setStep] = useState<Step>("welcome")
  const [website, setWebsite] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dismiss = () => {
    if (step !== "working") {
      void complete({ tenantId }).catch(() => undefined)
    }

    onClose()
  }

  const onContinue = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      await complete({ tenantId, website: website.trim() })
      setStep("working")
    } catch (caught) {
      reportWebsiteStartError(caught, setError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) {
          dismiss()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        {step === "welcome" ? (
          <WelcomeStep onStart={() => setStep("website")} onSkip={dismiss} />
        ) : null}
        {step === "website" ? (
          <WebsiteStep
            website={website}
            isSubmitting={isSubmitting}
            error={error}
            onWebsiteChange={setWebsite}
            onContinue={() => void onContinue()}
            onSkip={dismiss}
          />
        ) : null}
        {step === "working" ? (
          <WorkingStep discovery={discovery} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
