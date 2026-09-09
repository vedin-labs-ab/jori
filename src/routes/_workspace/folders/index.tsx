import { createFileRoute } from "@tanstack/react-router"
import { FoldersOverview } from "@/console/folders/list/overview"

export const Route = createFileRoute("/_workspace/folders/")({
  component: FoldersOverview,
})
