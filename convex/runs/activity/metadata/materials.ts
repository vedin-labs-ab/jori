import { isRecord } from "../../../../contracts/json"
import { optionalString } from "../../../shared/input"
import { compactMetadata, item } from "../helpers"

// Materials metadata names the table or store a tool touched. Ids come from
// tool inputs; display names from the docs the activity loader resolved.

const storeTools = new Set(["read_store", "write_store"])
const tableTools = new Set([
  "read_table",
  "list_table_rows",
  "insert_table_row",
  "update_table_row",
  "delete_table_row",
])

type MaterialReference = {
  table: "stores" | "tables"
  id: string
}

export function activityMaterialId(
  tool: string | undefined,
  input: Record<string, unknown> | undefined
): MaterialReference | undefined {
  if (tool !== undefined && storeTools.has(tool)) {
    const id = optionalString(input?.storeId)

    return id === undefined ? undefined : { table: "stores", id }
  }

  if (tool !== undefined && tableTools.has(tool)) {
    const id = optionalString(input?.tableId)

    return id === undefined ? undefined : { table: "tables", id }
  }

  return undefined
}

export function materialMetadata(args: {
  materialNames: ReadonlyMap<string, string>
  input: Record<string, unknown> | undefined
  tool: string
}) {
  const reference = activityMaterialId(args.tool, args.input)

  if (reference === undefined) {
    return []
  }

  return compactMetadata([
    item("target", args.materialNames.get(reference.id) ?? reference.id),
    item("scope", storeWriteLabel(args.tool, args.input)),
  ])
}

function storeWriteLabel(
  tool: string,
  input: Record<string, unknown> | undefined
) {
  if (tool !== "write_store" || input === undefined) {
    return undefined
  }

  if (isRecord(input.claim) && Array.isArray(input.claim.path)) {
    return `claim ${input.claim.path.join(".")}`
  }

  return "patch" in input ? "merge" : "replace"
}
