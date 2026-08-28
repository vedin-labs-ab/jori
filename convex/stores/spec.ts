import {
  normalizeStoreSchema,
  storeLimits,
} from "../../contracts/stores/contract"
import { type KindSpec } from "../collections/spec"

/** A store is a collection with exactly one document, whose schema is
 *  authored directly as JSON Schema and fixed at creation. */
export const storeSpec: KindSpec<"store"> = {
  kind: "store",
  label: "Store",
  singleton: true,
  maxDocumentBytes: storeLimits.maxValueBytes,
  normalize: (input) => ({
    kind: "store",
    schema: normalizeStoreSchema(input),
  }),
  evolve: () => {
    throw new Error("Store schemas are fixed at creation.")
  },
  compile: (authoring) => authoring.schema,
  documentLabel: (store) => `Store ${store.name}`,
}
