import { createFileRoute, Outlet } from "@tanstack/react-router"
import { consoleDocumentTitle } from "@/console/shell/routes"

export const Route = createFileRoute("/tables")({
  component: Outlet,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/tables") }] }),
})
