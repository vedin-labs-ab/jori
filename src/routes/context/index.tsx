import { createFileRoute } from "@tanstack/react-router"
import { ContextOrganization } from "@/console/context"

export const Route = createFileRoute("/context/")({
  component: ContextOrganization,
})
