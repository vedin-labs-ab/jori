import { useAction, useQuery } from "convex/react"
import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { api } from "../../../../../convex/_generated/api"
import { reportWebsiteStartError } from "../discovery/url"
import {
  DiscoveryWorkingStep,
  WebsiteDiscoveryStep,
} from "../discovery/website"
import { WelcomeStep } from "./welcome"

type Step = "welcome" | "website" | "working"

export function OnboardingModal({
  organizationId,
  onClose,
}: {
  organizationId: string
  onClose: () => void
}) {
  const complete = useAction(api.organization.onboarding.complete)
  const discovery = useQuery(api.organization.discovery.get, { organizationId })
  const [step, setStep] = useState<Step>("welcome")
  const [website, setWebsite] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dismiss = () => {
    if (step !== "working") {
      void complete({ organizationId }).catch(() => undefined)
    }

    onClose()
  }

  const onContinue = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      await complete({ organizationId, website: website.trim() })
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
          <WebsiteDiscoveryStep
            description="Jori reads only your public site to learn your name and how you describe yourselves."
            error={error}
            inputId="onboarding-website"
            isSubmitting={isSubmitting}
            onContinue={() => void onContinue()}
            onSkip={dismiss}
            onWebsiteChange={setWebsite}
            title="What's your website?"
            website={website}
          />
        ) : null}
        {step === "working" ? (
          <DiscoveryWorkingStep discovery={discovery} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
