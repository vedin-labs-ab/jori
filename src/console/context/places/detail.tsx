import {
  placeKinds,
  placeSectionLabels,
  placeSections,
} from "@contracts/places"
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
import { IntegrationChips } from "../../shared/logo/integration"
import { relativeTime, useNow } from "../../shared/time"
import { ContextSectionTitle } from "../section"
import { PlaceName } from "./card"
import { type Place } from "./types"

// A faithful render of the context block Milo reads in this place: the same
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
  const noun = placeKinds[place.integration].noun

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          <PlaceName place={place} />
        </SheetTitle>
        <SheetDescription>
          What Milo knows about how this {noun} works
          {place.profiledAt === null
            ? ""
            : ` · updated ${relativeTime(place.profiledAt, now)}`}
        </SheetDescription>
        <IntegrationChips integrations={[place.integration]} />
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        {placeSections.map((section) => (
          <ClaimSection key={section} place={place} section={section} />
        ))}
        <p className="mt-auto border-t pt-3 text-muted-foreground/70 text-xs">
          Norms fade when {noun} activity stops confirming them, then drop off.
        </p>
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
      {claims.map((claim) => (
        <Claim key={claim.text} claim={claim} />
      ))}
    </div>
  )
}

function Claim({ claim }: { claim: Place["claims"][number] }) {
  if (!claim.fading) {
    return <p className="text-sm">{claim.text}</p>
  }

  return (
    <p className="flex items-start gap-2 text-muted-foreground text-sm">
      <span>{claim.text}</span>
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
    </p>
  )
}
