import { createFileRoute } from "@tanstack/react-router"
import { OrganizationUsagePage } from "@/console/folders/usage"
import {
  defaultUsageDays,
  usageDaysSearch,
} from "@/shared/console/folders/usage/types"

// A static segment, so it wins over /folders/$folderId; no folder id can
// spell "usage".
export const Route = createFileRoute("/_workspace/folders/usage")({
  validateSearch: (search) => usageDaysSearch(search.days),
  component: OrganizationUsageRoute,
})

function OrganizationUsageRoute() {
  const { days } = Route.useSearch()

  return <OrganizationUsagePage days={days ?? defaultUsageDays} />
}
