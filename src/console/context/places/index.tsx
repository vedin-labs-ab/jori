import { useQuery } from "convex/react"
import { Signpost } from "lucide-react"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../convex/_generated/api"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { useNow } from "../../shared/time"
import { ContextPage } from ".."
import { ContextSectionTitle } from "../section"
import { PlaceCard, WarmingPlaceCard } from "./card"
import { PlaceDetail } from "./detail"
import { type Place, type Places } from "./types"

// Milo's per-place working memory: the places it works in and what it
// believes about how each one operates. Read-only — profiles are distilled
// from each place's own traffic and correct themselves as it changes.
export function ContextPlaces() {
  return (
    <ContextPage tab="places">
      {(tenantId) => <PlacesView tenantId={tenantId} />}
    </ContextPage>
  )
}

function PlacesView({ tenantId }: { tenantId: string }) {
  const result = useQuery(api.places.console.list, { tenantId })
  const [openId, setOpenId] = useState<Place["id"] | null>(null)
  const places = result?.places ?? []
  const open = places.find((row) => row.id === openId) ?? null

  if (result === undefined) {
    return <Skeleton className="h-28 w-full" />
  }

  return (
    <div className="flex flex-col gap-4">
      <PlaceGroups places={places} onOpen={(place) => setOpenId(place.id)} />
      <PlaceDetail place={open} onClose={() => setOpenId(null)} />
    </div>
  )
}

function PlaceGroups({
  places,
  onOpen,
}: {
  places: Places
  onOpen: (place: Place) => void
}) {
  const now = useNow(30_000)
  const profiled = places.filter((place) => place.claims.length > 0)
  const warming = places.filter((place) => place.claims.length === 0)

  if (places.length === 0) {
    return <PlacesEmpty />
  }

  return (
    <>
      {profiled.length === 0 ? null : (
        <ul className="flex flex-col gap-2">
          {profiled.map((place) => (
            <li key={place.id}>
              <PlaceCard now={now} place={place} onOpen={() => onOpen(place)} />
            </li>
          ))}
        </ul>
      )}
      {warming.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <ContextSectionTitle count={warming.length}>
              Warming up
            </ContextSectionTitle>
            <p className="text-muted-foreground text-sm">
              Milo is in these places but hasn't learned their norms yet.
              Profiles build as conversation happens.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {warming.map((place) => (
              <li key={place.id}>
                <WarmingPlaceCard place={place} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function PlacesEmpty() {
  return (
    <ConsoleEmptyState
      description="Milo learns each place it works in. They appear here once it sees activity."
      icon={Signpost}
      title="No places yet"
    />
  )
}
