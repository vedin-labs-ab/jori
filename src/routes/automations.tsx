import { createFileRoute } from "@tanstack/react-router"
import { Automations } from "@/console/automations"

export const Route = createFileRoute("/automations")({
  component: Automations,
})
