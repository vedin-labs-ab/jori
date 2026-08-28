import { downloadTextFile, toFilename } from "@/lib/download"
import { type StoreDetail } from "./types"

/** The store's current value as pretty-printed JSON, newline-terminated. */
export function buildJsonExport(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`
}

/** Download the store's current value as `<store-name>.json`. The value
 *  already rides along on the detail query, so no fetch is needed. */
export function exportStoreJson(store: StoreDetail) {
  downloadTextFile(
    toFilename(store.name, "json"),
    buildJsonExport(store.value),
    "application/json"
  )
}
