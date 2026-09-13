import { type ReactNode } from "react"
import { type StoreDetail } from "@/shared/console/stores/types"
import { StoreValue as StoreValueView } from "@/shared/console/stores/value/section"
import { useStoreWrites } from "./writes"

export function StoreValue({
  audience,
  organizationId,
  store,
  titleMenu,
}: {
  audience?: ReactNode
  organizationId: string
  store: StoreDetail
  titleMenu: (lead: ReactNode) => ReactNode
}) {
  const writes = useStoreWrites(organizationId, store.storeId)

  return (
    <StoreValueView
      audience={audience}
      {...writes}
      store={store}
      titleMenu={titleMenu}
    />
  )
}
