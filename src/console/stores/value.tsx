import { useMutation } from "convex/react"
import { type ReactNode } from "react"
import { type StoreDetail } from "@/shared/console/stores/types"
import { StoreValue as StoreValueView } from "@/shared/console/stores/value/section"
import { api } from "../../../convex/_generated/api"

/** The store's value and schema editors over their mutations: the value
 *  writes wholesale against the version the editor last saw, the schema
 *  replaces or removes the constraint. */
export function StoreValue({
  organizationId,
  store,
  titleMenu,
}: {
  organizationId: string
  store: StoreDetail
  titleMenu: (lead: ReactNode) => ReactNode
}) {
  const writeValue = useMutation(api.stores.console.writeValue)
  const writeSchema = useMutation(api.stores.console.writeSchema)

  return (
    <StoreValueView
      onWriteSchema={(schema) =>
        writeSchema({ organizationId, storeId: store.storeId, schema })
      }
      onWriteValue={(value, expectedVersion) =>
        writeValue({
          organizationId,
          storeId: store.storeId,
          value,
          expectedVersion,
        })
      }
      store={store}
      titleMenu={titleMenu}
    />
  )
}
