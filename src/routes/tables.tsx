import { createFileRoute, Outlet } from "@tanstack/react-router"
import { MaterialFrame } from "@/console/frame"
import { consoleDocumentTitle } from "@/console/shell/routes"

export const Route = createFileRoute("/tables")({
  component: TablesSection,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/tables") }] }),
})

/** The section frame outlives the move between the list and one table, so
 *  the console chrome around them is mounted once. */
function TablesSection() {
  return (
    <MaterialFrame>
      <Outlet />
    </MaterialFrame>
  )
}
