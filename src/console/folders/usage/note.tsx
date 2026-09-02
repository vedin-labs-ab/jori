import { useQuery } from "convex/react"
import { UsageNoteButton } from "@/shared/console/folders/usage/note"
import { type UsageDays } from "@/shared/console/folders/usage/types"
import { api } from "../../../../convex/_generated/api"

/** The usage note bound to the organization's declared zone. It reads the
 *  zone itself, so the crumb can carry it before any usage has loaded and
 *  from either scope alike. The organization comes as a prop: the crumb is
 *  rendered in the shell's header, above the organization context the
 *  page's own content sits inside. */
export function UsageNote({
  days,
  organizationId,
}: {
  days: UsageDays
  organizationId: string
}) {
  const profile = useQuery(api.organization.profile.get, { organizationId })
  const timezone = profile?.declared?.timezone ?? "the organization's time zone"

  return <UsageNoteButton days={days} timezone={timezone} />
}
