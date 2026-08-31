import { createFileRoute } from "@tanstack/react-router"
import { FoldersOverview } from "@/console/folders/list/overview"
import { usageSearch } from "@/console/folders/usage/types"

export const Route = createFileRoute("/folders/")({
  validateSearch: (search) => usageSearch(search.usage),
  component: FoldersRoute,
})

function FoldersRoute() {
  const { usage } = Route.useSearch()

  return <FoldersOverview usage={usage} />
}
