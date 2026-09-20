import { utcTimezone } from "@contracts/timezone"
import { useMutation } from "convex/react"
import { useState } from "react"
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../../../convex/_generated/api"
import { TimezonePicker } from "../../../organization/timezone"
import { ContextSectionTitle } from "../../section"

/**
 * The organization's own day, declared during onboarding and corrected here.
 * Until one is declared the platform counts in UTC, which is what an
 * undeclared organization should see stated rather than left blank.
 */
export function TimezoneSection({
  declared,
  organizationId,
}: {
  declared: string | undefined
  organizationId: string
}) {
  const declareTimezone = useMutation(api.organization.profile.declareTimezone)
  // The chosen zone leads until the profile query catches up, and falls
  // back to the stored one if the write is refused.
  const [choice, setChoice] = useState<string | null>(null)

  async function change(timezone: string) {
    setChoice(timezone)

    try {
      await declareTimezone({ organizationId, timezone })
    } catch (error) {
      showErrorToast(error, "Could not change the timezone.")
    } finally {
      setChoice(null)
    }
  }

  return (
    <section className="grid gap-2.5">
      <ContextSectionTitle hint="Days in usage and reports follow this zone. Changing it re-dates what has already been counted.">
        Timezone
      </ContextSectionTitle>
      <div className="max-w-64">
        <TimezonePicker
          ariaLabel="Timezone"
          id="organization-timezone"
          onChange={(timezone) => void change(timezone)}
          value={choice ?? declared ?? utcTimezone}
        />
      </div>
    </section>
  )
}
