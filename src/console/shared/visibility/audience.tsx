import { type Visibility } from "@contracts/visibility"
import { useQuery } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { AudienceSentence } from "@/shared/console/visibility/audience"
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
    <p className="text-muted-foreground text-sm">
      <AudienceSentence
        audience={audience}
        mode={value.mode}
        viewerId={viewerId ?? null}
      />
      {audience.narrowedBy === null || value.mode === "organization"
        ? null
        : ` Narrowed to ${audience.narrowedBy} by the folder it's in.`}
    </p>
  )
}
