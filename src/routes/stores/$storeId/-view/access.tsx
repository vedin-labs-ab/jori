import { type GenericId } from "convex/values"
import { lazy } from "react"
import { useMaterialMode } from "@/console/frame/mode"
import { useShareSecret } from "@/shared/share/link"
import { StoreShareView } from "@/shared/share/store"

/** Lazy so anonymous share-link visitors do not download the member console
 *  graph after the section frame establishes that there is no member. */
const StoreView = lazy(() =>
  import("@/console/stores/view").then((module) => ({
    default: module.StoreView,
  }))
)

export function StoreAccess({ storeId }: { storeId: string }) {
  const mode = useMaterialMode()
  const secret = useShareSecret() ?? null

  if (mode === "share") {
    return <StoreShareView secret={secret} storeId={storeId} />
  }

  return (
    <StoreView
      fallback={
        secret === null ? undefined : (
          <StoreShareView secret={secret} storeId={storeId} />
        )
      }
      storeId={storeId as GenericId<"collections">}
    />
  )
}
