import { createFileRoute } from "@tanstack/react-router"
import { Artifacts } from "@/console/artifacts"

export const Route = createFileRoute("/artifacts/")({
  component: Artifacts,
})
