import { placeSectionLabels, placeSections } from "@contracts/places"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { scrollFade } from "@/shared/fade"
import { CopyableCodeBlock } from "../../shared/copy"
import { relativeTime, useNow } from "../../shared/time"
import { ContextSectionTitle } from "../section"
import { PlaceMeta, PlaceName } from "./card"
import { type Place } from "./types"

// A faithful render of the context block Jori reads in this place: the same
// sections, in the same order, with the same words. Lifecycle surfaces only
// as a quiet fading cue.
export function PlaceDetail({
  place,
  onClose,
}: {
  place: Place | null
  onClose: () => void
}) {
  return (
    <Sheet
      open={place !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 data-[side=right]:sm:max-w-lg">
        {place === null ? null : <DetailBody place={place} />}
      </SheetContent>
    </Sheet>
  )
}

function DetailBody({ place }: { place: Place }) {
  const now = useNow(30_000)

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          <PlaceName place={place} />
        </SheetTitle>
        {place.profiledAt === null ? null : (
          <SheetDescription>
            Updated {relativeTime(place.profiledAt, now)}
          </SheetDescription>
        )}
        <PlaceMeta place={place} />
      </SheetHeader>
      <div
        className={cn(
          scrollFade,
          "flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4"
        )}
      >
        {placeSections.map((section) => (
          <ClaimSection key={section} place={place} section={section} />
        ))}
      </div>
    </>
  )
}

function ClaimSection({
  place,
  section,
}: {
  place: Place
  section: (typeof placeSections)[number]
}) {
  const claims = place.claims.filter((claim) => claim.section === section)

  if (claims.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ContextSectionTitle>{placeSectionLabels[section]}</ContextSectionTitle>
      <CopyableCodeBlock
        label={placeSectionLabels[section]}
        value={claims.map((claim) => claim.text).join("\n")}
      >
        <span className="flex flex-col gap-1.5">
          {claims.map((claim) => (
            <Claim key={claim.text} claim={claim} />
          ))}
        </span>
      </CopyableCodeBlock>
    </div>
  )
}

function Claim({ claim }: { claim: Place["claims"][number] }) {
  if (!claim.fading) {
    return (
      <span className="block whitespace-pre-wrap break-words">
        {claim.text}
      </span>
    )
  }

  return (
    <span className="flex items-start justify-between gap-2 text-muted-foreground">
      <span className="whitespace-pre-wrap break-words">{claim.text}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="text-muted-foreground" variant="outline">
            Fading
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Not re-observed in recent activity; drops off unless confirmed.
        </TooltipContent>
      </Tooltip>
    </span>
  )
}
