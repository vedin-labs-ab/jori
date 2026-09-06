import { type ReactNode } from "react"
import { type StoreDetail } from "@/shared/console/stores/types"
import { StoreValue as StoreValueView } from "@/shared/console/stores/value/section"
import { useStoreWrites } from "./writes"

/** The store's value and schema editors over their writes. */
export function StoreValue({
  organizationId,
  store,
  titleMenu,
}: {
  organizationId: string
  store: StoreDetail
  titleMenu: (lead: ReactNode) => ReactNode
}) {
  const writes = useStoreWrites(organizationId, store.storeId)

  return <StoreValueView {...writes} store={store} titleMenu={titleMenu} />
}
