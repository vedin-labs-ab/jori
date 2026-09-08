import { type Doc } from "../../_generated/dataModel"
import { type SearchRunsArgs } from "./schema"

type Position = { createdAt: number; id: string }

export function runSearchKey(current: Doc<"runs">, args: SearchRunsArgs) {
  return JSON.stringify([
    current.organizationId,
    current.audience,
    current.conversationId,
    current.createdBy,
    args.mode,
    args.mode === "search" ? (args.scope ?? "conversation") : undefined,
    args.mode === "children" ? args.parentId : undefined,
    args.mode === "tree" ? args.rootId : undefined,
    args.mode === "ids" ? [...new Set(args.runIds)].sort() : undefined,
    args.query,
    args.source,
    args.status,
    args.since,
    args.until,
  ])
}

export function readRunCursor(cursor: string | undefined, search: string) {
  if (cursor === undefined) {
    return undefined
  }

  let value: unknown
  try {
    value = JSON.parse(cursor)
  } catch {
    throw new Error("Invalid search_runs cursor")
  }

  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    typeof value[0] !== "number" ||
    !Number.isFinite(value[0]) ||
    value[0] < 0 ||
    typeof value[1] !== "string" ||
    value[1].length === 0 ||
    value[1].length > 128 ||
    value[2] !== search
  ) {
    throw new Error("Invalid search_runs cursor for this search")
  }

  return { createdAt: value[0], id: value[1] }
}

export function compareRuns(left: Doc<"runs">, right: Doc<"runs">) {
  return (
    right.createdAt - left.createdAt ||
    (left._id === right._id ? 0 : left._id < right._id ? 1 : -1)
  )
}

export function isAfterCursor(run: Doc<"runs">, cursor: Position | undefined) {
  return (
    cursor === undefined ||
    run.createdAt < cursor.createdAt ||
    (run.createdAt === cursor.createdAt && run._id < cursor.id)
  )
}

export function nextRunCursor(
  runs: Doc<"runs">[],
  limit: number,
  search: string
) {
  const last = runs[limit - 1]
  return runs.length > limit && last !== undefined
    ? JSON.stringify([last.createdAt, last._id, search])
    : null
}
