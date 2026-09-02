import { downloadTextFile, toFilename } from "@/shared/files/download"
import { type StoreDetail } from "./types"

/** The store's current value as pretty-printed JSON, newline-terminated. */
export function buildJsonExport(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`
}

/** Download the store's current value as `<store-name>.json`. The value
 *  already rides along on the detail, so no fetch is needed. */
export function exportStoreJson(store: Pick<StoreDetail, "name" | "value">) {
  downloadTextFile(
    toFilename(store.name, "json"),
    buildJsonExport(store.value),
    "application/json"
  )
}
