import { createFileRoute } from "@tanstack/react-router"
import { OrganizationContext } from "@/console/context"

export const Route = createFileRoute("/context")({
  component: OrganizationContext,
})
