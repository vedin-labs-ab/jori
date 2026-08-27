import { createFileRoute } from "@tanstack/react-router"
import { type GenericId } from "convex/values"
import { StoreView } from "@/console/stores/view"

export const Route = createFileRoute("/stores/$storeId")({
  component: StoreRoute,
})

function StoreRoute() {
  const { storeId } = Route.useParams()

  return <StoreView storeId={storeId as GenericId<"stores">} />
}
