import { placeDisplayName, placeKinds } from "@contracts/places"
import { ChevronRight, Lock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { IntegrationLogo } from "@/shared/logo/integration"
import { relativeTime, shortDate } from "../../shared/time"
import { type Place } from "./types"

// Same three-row anatomy as workstream cards: name, one-line preview, meta.
// Places are single-integration, so the meta row wears one logo and the
// place kind instead of a source chip rollup.
export function PlaceCard({
  place,
  now,
  onOpen,
}: {
  place: Place
  now: number
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
          <PlaceMeta
            note={
              place.profiledAt === null
                ? undefined
                : `updated ${relativeTime(place.profiledAt, now)}`
            }
            place={place}
          />
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </Card>
  )
}

// Places Milo is present in but has no norms for yet: quiet, not clickable,
// there to show coverage. The section header explains warming once; each
// card carries only its own facts. The dashed edge is an SVG overlay, not a
// CSS border: border-style:dashed can't space its dashes, and they pack so
// tight they read as a solid line.
export function WarmingPlaceCard({ place }: { place: Place }) {
  return (
    <Card className="relative overflow-visible py-0 shadow-none ring-0">
      <DashedEdge />
      <div className="flex w-full items-center gap-3 p-4">
        <div className="flex min-w-0 grow flex-col gap-2">
          <PlaceName muted place={place} />
          <PlaceMeta
            note={`watching since ${shortDate(place.watchingSince)}`}
            place={place}
          />
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

export function PlaceMeta({ note, place }: { note?: string; place: Place }) {
  const kind = placeKinds[place.integration].label

  return (
    <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
      <IntegrationLogo className="size-3.5" integration={place.integration} />
      {note === undefined ? kind : `${kind} · ${note}`}
    </p>
  )
}

// A roomy dashed frame that follows the card's radius. currentColor keeps it
// theme-aware; the 6px dash and 7px gap give the breathing room a CSS dashed
// border can't. rx matches rounded-lg (--radius, 10px).
function DashedEdge() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full overflow-visible text-border"
    >
      <rect
        fill="none"
        height="100%"
        rx="10"
        stroke="currentColor"
        strokeDasharray="6 7"
        width="100%"
        x="0"
        y="0"
      />
    </svg>
  )
}

function placePreview(place: Place) {
  const purpose = place.claims.find((claim) => claim.section === "purpose")

  return (purpose ?? place.claims[0])?.text ?? ""
}
