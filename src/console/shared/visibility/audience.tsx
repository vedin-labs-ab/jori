import { type Visibility } from "@contracts/visibility"
import { useQuery } from "convex/react"
import { type FunctionArgs, type FunctionReturnType } from "convex/server"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from "../../../../convex/_generated/api"

// What the stored mode does not say: who a visibility actually reaches
// once the folders above it have had their say. The sentence tracks the
// draft, so it answers before anything is saved.

type AudienceArgs = FunctionArgs<typeof api.visibility.console.audience>
type ResolvedAudience = NonNullable<
  FunctionReturnType<typeof api.visibility.console.audience>
>

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

/** Organization-wide reads as itself only where nothing narrows it; inside
 *  a narrowing folder the honest audience is that folder's. Grant-shaped
 *  audiences are counted, with the names a hover away. */
function AudienceSentence({
  audience,
  mode,
  viewerId,
}: {
  audience: ResolvedAudience
  mode: Visibility["mode"]
  viewerId: string | null
}) {
  if (mode === "organization") {
    return audience.narrowedBy === null
      ? "Visible to everyone in the organization."
      : `Visible to everyone who can see ${audience.narrowedBy}.`
  }

  const { people } = audience
  const sentence =
    people.length === 1 && people[0].personId === viewerId
      ? "Visible to 1 person — only you."
      : `Visible to ${people.length} ${people.length === 1 ? "person" : "people"}.`

  if (people.length === 0) {
    return sentence
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="underline decoration-dotted underline-offset-4">
          {sentence}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {people.map((person) => person.name ?? "Member").join(", ")}
      </TooltipContent>
    </Tooltip>
  )
}
