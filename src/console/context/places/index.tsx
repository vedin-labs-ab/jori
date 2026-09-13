import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { Cable, Signpost } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  ConsoleEmptyState,
  ConsoleListEmpty,
} from "@/shared/console/list/empty"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { useNow } from "@/shared/console/time"
import { api } from "../../../../convex/_generated/api"
import { ContextPage } from ".."
import { ContextSectionTitle } from "../section"
import { PlaceCard, WarmingPlaceCard } from "./card"
import { PlaceDetail } from "./detail"
import { type Place, type Places } from "./types"

// Jori's per-place working memory: the places it works in and what it
// believes about how each one operates. Read-only — profiles are distilled
// from each place's own traffic and correct themselves as it changes.
export function ContextPlaces() {
  return (
    <ContextPage tab="places">
      {(organizationId) => <PlacesView organizationId={organizationId} />}
    </ContextPage>
  )
}

function PlacesView({ organizationId }: { organizationId: string }) {
  const result = useQuery(api.places.console.list, { organizationId })
  const [openId, setOpenId] = useState<Place["id"] | null>(null)
  const places = result?.places ?? []
  const open = places.find((row) => row.id === openId) ?? null

  if (result === undefined) {
    return <ConsoleListLoading />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
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
    return (
      <ConsoleListEmpty>
        <PlacesEmpty />
      </ConsoleListEmpty>
    )
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
          <ContextSectionTitle
            count={warming.length}
            hint="Jori is in these places but hasn't learned their norms yet. Profiles build as conversation happens."
          >
            Warming up
          </ContextSectionTitle>
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
      // Places are learned from activity, not created by hand, so the
      // closest primary action is connecting the tools they live in.
      action={
        <Button asChild variant="outline">
          <Link to="/integrations">
            <Cable />
            Connect integrations
          </Link>
        </Button>
      }
      description="Jori learns each place it works in. They appear here once it sees activity."
      icon={Signpost}
      title="No places yet"
    />
  )
}
