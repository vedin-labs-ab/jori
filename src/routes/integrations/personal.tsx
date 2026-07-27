import { createFileRoute } from "@tanstack/react-router"
import { PersonalIntegrations } from "@/console/integrations"

export const Route = createFileRoute("/integrations/personal")({
  component: PersonalIntegrations,
})
