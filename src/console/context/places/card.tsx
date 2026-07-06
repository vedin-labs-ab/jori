import { placeDisplayName } from "@contracts/places"
import { ChevronRight, Lock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { IntegrationChips } from "../../shared/logo/integration"
import { type Place } from "./types"

// Same three-row anatomy as workstream cards: name, one-line preview,
// sources. Everything else waits in the detail sheet.
export function PlaceCard({
  place,
  onOpen,
}: {
  place: Place
  onOpen: () => void
}) {
  return (
    <Card className="py-0 transition-colors hover:bg-muted/50">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex min-w-0 grow flex-col gap-2">
          <PlaceName place={place} />
          <p className="line-clamp-2 text-muted-foreground text-sm">
            {placePreview(place)}
          </p>
          <IntegrationChips integrations={[place.integration]} />
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </Card>
  )
}

// Places Milo is present in but has no norms for yet: quiet, not clickable,
// there to show coverage and set expectations.
export function WarmingPlaceCard({ place }: { place: Place }) {
  return (
    <Card className="border-dashed py-0 shadow-none">
      <div className="flex w-full items-center gap-3 p-4">
        <div className="flex min-w-0 grow flex-col gap-2">
          <PlaceName muted place={place} />
          <p className="text-muted-foreground/70 text-sm">
            Still learning — no norms yet.
          </p>
        </div>
      </div>
    </Card>
  )
}

export function PlaceName({
  muted = false,
  place,
}: {
  muted?: boolean
  place: Place
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <span
        className={`truncate font-medium text-sm ${muted ? "text-muted-foreground" : ""}`}
      >
        {placeDisplayName(place.integration, place.name)}
      </span>
      {place.visibility === "private" ? (
        <Lock
          aria-label="Private"
          className="size-3 shrink-0 text-muted-foreground"
        />
      ) : null}
    </div>
  )
}

function placePreview(place: Place) {
  const purpose = place.claims.find((claim) => claim.section === "purpose")

  return (purpose ?? place.claims[0])?.text ?? ""
}
