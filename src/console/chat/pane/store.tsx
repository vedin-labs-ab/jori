import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { type StoreDetail } from "@/shared/console/stores/types"
import { api } from "../../../../convex/_generated/api"
import { OrganizationVisibilityButton } from "../../shared/visibility/button"
import { useStoreWrites } from "../../stores/writes"

/** A store in the pane: its value and schema editors over the same
 *  writes its page uses. */
export function PaneStore({
  id,
  organizationId,
}: {
  id: string
  organizationId: string
}) {
  const result = useQuery(api.stores.console.get, {
    organizationId,
    storeId: id as GenericId<"collections">,
  })

  if (result === undefined) {
    return <ConsoleListLoading />
  }

  if (result.status !== "ready" || result.store === null) {
    return null
  }

  return <PaneValue organizationId={organizationId} store={result.store} />
}

function PaneValue({
  organizationId,
  store,
}: {
  organizationId: string
  store: StoreDetail
}) {
  const writes = useStoreWrites(organizationId, store.storeId)

  return (
    <ChatPaneBody
      material={{
        kind: "store",
        audience: (
          <OrganizationVisibilityButton
            {...store}
            organizationId={organizationId}
            target={{ kind: "store", id: store.storeId }}
          />
        ),
        store,
        ...writes,
      }}
    />
  )
}
