import { createFileRoute } from "@tanstack/react-router"
import { FolderPage } from "@/console/folders"
import { usageSearch } from "@/console/folders/usage/types"

export const Route = createFileRoute("/folders/$folderId/")({
  validateSearch: (search) => usageSearch(search.usage),
  component: FolderRoute,
})

function FolderRoute() {
  const { folderId } = Route.useParams()
  const { usage } = Route.useSearch()

  return <FolderPage folderId={folderId} usage={usage} />
}
