import { createFileRoute } from "@tanstack/react-router"
import { TablesPage } from "@/console/tables"

export const Route = createFileRoute("/_workspace/tables/")({
  component: TablesPage,
})
