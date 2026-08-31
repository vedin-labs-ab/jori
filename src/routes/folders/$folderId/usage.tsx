import { createFileRoute } from "@tanstack/react-router"
import { FolderUsagePage } from "@/console/folders/usage"
import {
  defaultUsageDays,
  usageDaysSearch,
} from "@/console/folders/usage/types"

// Recharts is heavy and only the usage routes draw with it; the file-based
// route splits it into its own chunk, so a folder's contents never load it.
export const Route = createFileRoute("/folders/$folderId/usage")({
  validateSearch: (search) => usageDaysSearch(search.days),
  component: FolderUsageRoute,
})

function FolderUsageRoute() {
  const { folderId } = Route.useParams()
  const { days } = Route.useSearch()

  return <FolderUsagePage days={days ?? defaultUsageDays} folderId={folderId} />
}
