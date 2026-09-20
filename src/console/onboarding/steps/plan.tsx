import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { showErrorToast } from "@/shared/console/error"
import { PurchaseAgreement } from "../../billing/agreement"
import { CheckoutButton, PlanOffer } from "../../billing/plan"
import { OnboardingStep } from "./layout"

/** How long a payment may take to be confirmed before the way on is offered
 *  without it. Polar usually says so before the person is back. */
const patienceMs = 8000

/** The plan, asked for once the person has seen what Jori makes of their
 *  organization: the offer and the agreement Billing settings shows, then
 *  Polar. There is one plan and no work without it, so there is no way
 *  around it, only back from checkout to here. */
export function PlanStep({
  onSubscribe,
  organization,
}: {
  /** Leaves for checkout. Rejects where checkout could not be opened. */
  onSubscribe: () => Promise<void>
  organization: string
}) {
  const [accepted, setAccepted] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  // Still leaving once it resolves: the page is on its way to Polar.
  const subscribe = async () => {
    setIsLeaving(true)

    try {
      await onSubscribe()
    } catch (caught) {
      showErrorToast(caught, "Couldn't open checkout. Try again.")
      setIsLeaving(false)
    }
  }

  return (
    <OnboardingStep
      description={`Jori starts working once ${organization} is on a plan. There's only one, it covers everyone, and you can cancel any time.`}
      primary={
        <CheckoutButton
          disabled={!accepted || isLeaving}
          onClick={() => void subscribe()}
          pending={isLeaving}
        />
      }
      title="Put Jori to work."
    >
      <div className="grid gap-4">
        <PlanOffer />
        <PurchaseAgreement accepted={accepted} onChange={setAccepted} />
      </div>
    </OnboardingStep>
  )
}

/** Back from checkout, paid, before Polar has told Jori so. The flow moves
 *  on by itself when it does; a person is never held here by a late word. */
export function PlanConfirmingStep({ onContinue }: { onContinue: () => void }) {
  const [isPatient, setIsPatient] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsPatient(false), patienceMs)

    return () => clearTimeout(timer)
  }, [])

  return (
    <OnboardingStep
      description={
        isPatient
          ? "This takes a few seconds."
          : "This is taking longer than usual. Your plan starts as soon as the payment comes through, so there's no need to wait here."
      }
      primary={
        isPatient ? (
          <Button disabled>
            <Spinner />
            Confirming
          </Button>
        ) : (
          <Button onClick={onContinue}>Continue</Button>
        )
      }
      title="Confirming your payment."
    />
  )
}
