import { type Visibility } from "@contracts/visibility"
import { type FunctionReturnType } from "convex/server"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type api } from "../../../../convex/_generated/api"

/** Who a visibility actually reaches once the folders above it have had
 *  their say. */
export type ResolvedAudience = NonNullable<
  FunctionReturnType<typeof api.visibility.console.audience>
>

/** Organization-wide reads as itself only where nothing narrows it; inside
 *  a narrowing folder the honest audience is that folder's. Grant-shaped
 *  audiences are counted, with the names a hover away. */
export function AudienceSentence({
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
