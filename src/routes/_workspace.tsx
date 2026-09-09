import { createFileRoute } from "@tanstack/react-router"
import { WorkspaceSection } from "@/console/frame"

// One parent for every workspace page. The URL stays unchanged.
export const Route = createFileRoute("/_workspace")({
  component: WorkspaceSection,
})
