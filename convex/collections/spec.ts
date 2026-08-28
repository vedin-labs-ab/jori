import { type JsonSchemaObject } from "../../contracts/schema/validate"
import { type TableColumn } from "../../contracts/tables/columns"
import { type Doc } from "../_generated/dataModel"

// The core stays kind-agnostic: everything a table or store does
// differently enters through a KindSpec its edge provides.

export type CollectionKind = "table" | "store"

export type CollectionDoc<K extends CollectionKind = CollectionKind> = Extract<
  Doc<"collections">,
  { kind: K }
>

/** The kind-native authoring schema, as stored on the collection. */
export type CollectionAuthoring<K extends CollectionKind = CollectionKind> =
  Extract<
    | { kind: "table"; columns: TableColumn[] }
    | { kind: "store"; schema: JsonSchemaObject },
    { kind: K }
  >

export type KindSpec<K extends CollectionKind = CollectionKind> = {
  kind: K
  /** Capitalized noun for error messages: "Table" or "Store". */
  label: string
  /** A singleton collection holds exactly one document. */
  singleton: boolean
  /** Byte budget for one document's value. */
  maxDocumentBytes: number
  /** Validate and normalize caller-supplied authoring input. */
  normalize(input: unknown): CollectionAuthoring<K>
  /** Apply the kind's evolution rules; throws when the change is illegal. */
  evolve(current: CollectionAuthoring<K>, next: unknown): CollectionAuthoring<K>
  /** Mechanically compile the authoring schema to the JSON Schema every
   *  document write validates against. */
  compile(authoring: CollectionAuthoring<K>): JsonSchemaObject
  /** How error messages name one document: "Row", "Store <name>", … */
  documentLabel(collection: CollectionDoc<K>): string
}

export function isCollectionKind<K extends CollectionKind>(
  collection: Doc<"collections">,
  kind: K
): collection is CollectionDoc<K> {
  return collection.kind === kind
}
