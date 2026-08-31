import { createFileRoute, Outlet } from "@tanstack/react-router"
import { MaterialFrame } from "@/console/frame"
import { consoleDocumentTitle } from "@/console/shell/routes"

export const Route = createFileRoute("/stores")({
  component: StoresSection,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/stores") }] }),
})

/** The section frame outlives the move between the list and one store, so
 *  the console chrome around them is mounted once. */
function StoresSection() {
  return (
    <MaterialFrame>
      <Outlet />
    </MaterialFrame>
  )
}
