import { createFileRoute, Outlet } from "@tanstack/react-router"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

export const Route = createFileRoute("/_workspace/stores")({
  component: Outlet,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/stores") }] }),
})
