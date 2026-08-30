import { type GenericId } from "convex/values"
import { lazy } from "react"
import { MaterialAccess } from "@/shared/materials/access"
import { StoreShareView } from "@/shared/materials/store"

/** Lazy so anonymous share-link visitors do not download the member console
 *  graph after the session check establishes that there is no member. */
const StoreView = lazy(() =>
  import("@/console/stores/view").then((module) => ({
    default: module.StoreView,
  }))
)

export function StoreAccess({
  secret,
  storeId,
}: {
  secret: string | null
  storeId: string
}) {
  return (
    <MaterialAccess
      label="Loading store"
      renderMember={(fallback) => (
        <StoreView
          fallback={fallback}
          storeId={storeId as GenericId<"collections">}
        />
      )}
      renderShare={() => <StoreShareView secret={secret} storeId={storeId} />}
      secret={secret}
    />
  )
}
