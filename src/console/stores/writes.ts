import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { type SchemaWrite } from "@/shared/console/stores/schema/dialog"
import { type ValueWrite } from "@/shared/console/stores/value/editor"
import { api } from "../../../convex/_generated/api"

/** The store's writes over their mutations: the value writes wholesale
 *  against the version the editor last saw, the schema replaces or
 *  removes the constraint. The store's page and the chat's pane edit the
 *  store through the same pair. */
export function useStoreWrites(
  organizationId: string,
  storeId: GenericId<"collections">
): { onWriteSchema: SchemaWrite; onWriteValue: ValueWrite } {
  const writeValue = useMutation(api.stores.console.writeValue)
  const writeSchema = useMutation(api.stores.console.writeSchema)

  return {
    onWriteSchema: (schema) => writeSchema({ organizationId, storeId, schema }),
    onWriteValue: (value, expectedVersion) =>
      writeValue({ organizationId, storeId, value, expectedVersion }),
  }
}
