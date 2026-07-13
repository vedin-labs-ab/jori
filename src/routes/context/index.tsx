import { createFileRoute } from "@tanstack/react-router"
import { ContextOrganization } from "@/console/context/organization"

export const Route = createFileRoute("/context/")({
  component: ContextOrganization,
})
