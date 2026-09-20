import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { showErrorToast } from "@/shared/console/error"
import { localTimezone } from "@/shared/console/time"
import { TimezoneField } from "../../organization/timezone"
import { OnboardingStep } from "./layout"

/** The organization's logo and the zone its days are counted in. Neither
 *  needs an answer: the logo is optional and the zone arrives as the
 *  browser's, so continuing is enough. The zone is declared here, before the
 *  console opens, so nothing is ever counted in the wrong one. */
export function DetailsStep({
  logo,
  onContinue,
}: {
  /** The logo field, which saves on its own. */
  logo: ReactNode
  onContinue: (timezone: string) => Promise<void>
}) {
  const [timezone, setTimezone] = useState(localTimezone)
  const [isSaving, setIsSaving] = useState(false)

  const submit = async () => {
    setIsSaving(true)

    try {
      await onContinue(timezone)
    } catch (caught) {
      showErrorToast(caught, "Couldn't save the timezone. Try again.")
      setIsSaving(false)
    }
  }

  return (
    <OnboardingStep
      description="The logo is optional. The timezone comes from your browser, so check it's the one your team works in. You can change both later."
      primary={
        <Button disabled={isSaving} onClick={() => void submit()}>
          {isSaving ? <Spinner /> : null}
          Continue
        </Button>
      }
      title="Logo and timezone"
    >
      <div className="grid gap-6">
        {logo}
        <TimezoneField
          description="Days in usage and reports follow this zone."
          disabled={isSaving}
          id="onboarding-timezone"
          onChange={setTimezone}
          value={timezone}
        />
      </div>
    </OnboardingStep>
  )
}
