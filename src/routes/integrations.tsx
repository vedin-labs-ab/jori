import { createFileRoute } from "@tanstack/react-router"
import { Integrations } from "@/console/integrations"

export const Route = createFileRoute("/integrations")({
  component: Integrations,
})
