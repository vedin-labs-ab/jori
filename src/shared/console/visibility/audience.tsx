import { type Visibility } from "@contracts/visibility"
import { type FunctionReturnType } from "convex/server"
import { Folder } from "lucide-react"
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

type AudienceProps = {
  audience: ResolvedAudience
  mode: Visibility["mode"]
  viewerId: string | null
}

/** The line under a visibility field: who the draft reaches, and the
 *  folder that narrowed it when one did. */
export function AudienceLine({ audience, mode, viewerId }: AudienceProps) {
  return (
    <p className="text-muted-foreground text-xs">
      <AudienceSentence audience={audience} mode={mode} viewerId={viewerId} />
      {audience.narrowedBy === null || mode === "organization" ? null : (
        <>
          {" "}
          Narrowed to <NarrowingFolder name={audience.narrowedBy} /> by the
          folder it's in.
        </>
      )}
    </p>
  )
}

/** Organization-wide reads as itself only where nothing narrows it; inside
 *  a narrowing folder the honest audience is that folder's. Grant-shaped
 *  audiences are counted, with the names a hover away. */
function AudienceSentence({ audience, mode, viewerId }: AudienceProps) {
  if (mode === "organization") {
    return audience.narrowedBy === null ? (
      "Visible to everyone in the organization."
    ) : (
      <>
        Visible to everyone who can see{" "}
        <NarrowingFolder name={audience.narrowedBy} />.
      </>
    )
  }

  const { people } = audience

  if (people.length === 0) {
    return "Visible to no one."
  }

  if (people.length === 1 && people[0].personId === viewerId) {
    return "Visible only to you."
  }

  return (
    <>
      Visible to <PeopleCount people={people} />.
    </>
  )
}

/** The folder doing the narrowing, marked as a folder so it can be found
 *  in the sentence at a glance. */
function NarrowingFolder({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 align-bottom">
      <Folder aria-hidden className="size-3.5 shrink-0" />
      <span className="font-medium text-foreground">{name}</span>
    </span>
  )
}

/** The count, with the names behind it: a hover or a focus lists them. */
function PeopleCount({ people }: { people: ResolvedAudience["people"] }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          type="button"
        >
          {people.length} {people.length === 1 ? "person" : "people"}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {people.map((person) => person.name ?? "Member").join(", ")}
      </TooltipContent>
    </Tooltip>
  )
}
