import { createFileRoute } from "@tanstack/react-router"
import { ContextPlaces } from "@/console/context/places"

export const Route = createFileRoute("/context/places")({
  component: ContextPlaces,
})
