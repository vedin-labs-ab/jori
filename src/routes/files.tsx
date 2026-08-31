import { createFileRoute, Outlet } from "@tanstack/react-router"
import { MaterialFrame } from "@/console/frame"
import { consoleDocumentTitle } from "@/console/shell/routes"

export const Route = createFileRoute("/files")({
  component: FilesSection,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/files") }] }),
})

/** The section frame outlives the move between the list and one file, so
 *  the console chrome around them is mounted once. */
function FilesSection() {
  return (
    <MaterialFrame>
      <Outlet />
    </MaterialFrame>
  )
}
