import { createFileRoute } from "@tanstack/react-router"
import { OrganizationIntegrations } from "@/console/integrations"

export const Route = createFileRoute("/integrations/")({
  component: OrganizationIntegrations,
})
