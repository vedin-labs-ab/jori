import { createFileRoute } from "@tanstack/react-router"
import { FolderPage } from "@/console/folders"

export const Route = createFileRoute("/_workspace/folders/$folderId/")({
  component: FolderRoute,
})

function FolderRoute() {
  const { folderId } = Route.useParams()

  return <FolderPage folderId={folderId} />
}
