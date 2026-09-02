import { type Visibility } from "@contracts/visibility"
import { useQuery } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { AudienceLine } from "@/shared/console/visibility/audience"
import { api } from "../../../../convex/_generated/api"

// What the stored mode does not say: who a visibility actually reaches
// once the folders above it have had their say. The sentence tracks the
// draft, so it answers before anything is saved.

type AudienceArgs = FunctionArgs<typeof api.visibility.console.audience>

export type AudienceTarget = AudienceArgs["target"]

export function AudienceSummary({
  organizationId,
  target,
  value,
}: {
  organizationId: string
  target: AudienceTarget
  value: Visibility
}) {
  const audience = useQuery(api.visibility.console.audience, {
    organizationId,
    target,
    visibility: value as AudienceArgs["visibility"],
  })
  const viewerId = useQuery(api.visibility.console.grantees, {
    organizationId,
  })?.viewerId

  if (audience === undefined || audience === null) {
    return null
  }

  return (
    <AudienceLine
      audience={audience}
      mode={value.mode}
      viewerId={viewerId ?? null}
    />
  )
}
