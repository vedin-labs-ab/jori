import { resolveWriteSchema } from "../../contracts/schema/validate"
import {
  normalizeStoreSchema,
  storeLimits,
} from "../../contracts/stores/contract"
import { type KindSpec } from "../collections/spec"

/** A store is a collection with exactly one document. Its JSON Schema is an
 *  optional constraint, authored directly and editable at any time; without
 *  one, the store accepts any JSON object. */
export const storeSpec: KindSpec<"store"> = {
  kind: "store",
  label: "Store",
  singleton: true,
  maxDocumentBytes: storeLimits.maxValueBytes,
  normalize: (input) => ({ kind: "store", schema: readSchemaInput(input) }),
  evolve: (_current, next) => ({
    kind: "store",
    schema: readSchemaInput(next),
  }),
  compile: (authoring) => resolveWriteSchema(authoring.schema),
  documentLabel: (store) => `Store ${store.name}`,
}

/** Callers pass null (or nothing) for a store without a schema. */
function readSchemaInput(input: unknown) {
  return input === null || input === undefined
    ? undefined
    : normalizeStoreSchema(input)
}
