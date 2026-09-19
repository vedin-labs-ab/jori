import { isRecord } from "../../../../contracts/json"
import { clampShareExpiryHours } from "../../../../contracts/shares/expiry"
import { optionalNumber, optionalString } from "../../../shared/input"
import { compactMetadata, item } from "../helpers"

// Materials metadata names the table, store, or files a tool touched. Ids
// come from tool inputs; display names from the docs the activity loader
// resolved, so a material the viewer cannot see stays a raw id.

const storeTools = new Set(["read_store", "write_store", "share_store"])
const tableTools = new Set([
  "read_table",
  "list_table_rows",
  "insert_table_row",
  "update_table_row",
  "delete_table_row",
  "share_table",
])
const fileTools = new Set(["read_file", "share_file"])
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

/** The files a tool call touched: a file tool's own file, and the saved
 *  files any tool sends along. */
export function activityFileIds(
  tool: string | undefined,
  input: Record<string, unknown> | undefined
): string[] {
  const own = ownFileId(tool, input)

  return own === undefined ? sentFileIds(input) : [own, ...sentFileIds(input)]
}

export function materialMetadata(args: {
  materialNames: ReadonlyMap<string, string>
  input: Record<string, unknown> | undefined
  tool: string
}) {
  const name = (id: string) => args.materialNames.get(id) ?? id
  const reference =
    activityMaterialId(args.tool, args.input) ??
    ownFileId(args.tool, args.input)
  const sent = sentFileIds(args.input).map(name)

  return compactMetadata([
    item("target", reference === undefined ? undefined : name(reference)),
    item(
      "scope",
      shareDurationLabel(args.tool, args.input) ??
        storeWriteLabel(args.tool, args.input)
    ),
    item("scope", sent.length === 0 ? undefined : `with ${sent.join(", ")}`),
  ])
}

function ownFileId(
  tool: string | undefined,
  input: Record<string, unknown> | undefined
) {
  return tool !== undefined && fileTools.has(tool)
    ? optionalString(input?.fileId)
    : undefined
}

function sentFileIds(input: Record<string, unknown> | undefined) {
  const files = Array.isArray(input?.files) ? input.files : []

  return files.flatMap((file) => {
    const id = isRecord(file) ? optionalString(file.fileId) : undefined

    return id === undefined ? [] : [id]
  })
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
