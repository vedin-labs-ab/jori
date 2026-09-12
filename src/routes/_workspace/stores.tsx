import { createFileRoute, Outlet } from "@tanstack/react-router"
import { WorkspaceNotFound } from "@/console/frame/missing"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

export const Route = createFileRoute("/_workspace/stores")({
  component: Outlet,
  notFoundComponent: WorkspaceNotFound,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/stores") }] }),
})
