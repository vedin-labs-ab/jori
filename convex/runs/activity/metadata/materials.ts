import { isRecord } from "../../../../contracts/json"
import { clampShareExpiryHours } from "../../../../contracts/shares/expiry"
import { optionalNumber, optionalString } from "../../../shared/input"
import { compactMetadata, item } from "../helpers"

// Materials metadata names the table, store, or file a tool touched. Ids
// come from tool inputs; display names from the docs the activity loader
// resolved (file shares fall back to the raw id).

const storeTools = new Set(["read_store", "write_store", "share_store"])
const tableTools = new Set([
  "read_table",
  "list_table_rows",
  "insert_table_row",
  "update_table_row",
  "delete_table_row",
  "share_table",
])
const shareTools = new Set(["share_table", "share_store", "share_file"])

/** The collection id a store or table tool call touched, if any. */
export function activityMaterialId(
  tool: string | undefined,
  input: Record<string, unknown> | undefined
): string | undefined {
  if (tool !== undefined && storeTools.has(tool)) {
    return optionalString(input?.storeId)
  }

  if (tool !== undefined && tableTools.has(tool)) {
    return optionalString(input?.tableId)
  }

  return undefined
}

export function materialMetadata(args: {
  materialNames: ReadonlyMap<string, string>
  input: Record<string, unknown> | undefined
  tool: string
}) {
  const reference = activityMaterialId(args.tool, args.input)
  const target =
    reference === undefined
      ? shareFileTarget(args.tool, args.input)
      : (args.materialNames.get(reference) ?? reference)

  if (target === undefined) {
    return []
  }

  return compactMetadata([
    item("target", target),
    item(
      "scope",
      shareDurationLabel(args.tool, args.input) ??
        storeWriteLabel(args.tool, args.input)
    ),
  ])
}

function shareFileTarget(
  tool: string,
  input: Record<string, unknown> | undefined
) {
  return tool === "share_file" ? optionalString(input?.fileId) : undefined
}

function shareDurationLabel(
  tool: string,
  input: Record<string, unknown> | undefined
) {
  if (!shareTools.has(tool)) {
    return undefined
  }

  return `${clampShareExpiryHours(optionalNumber(input?.expiresInHours))}h link`
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
