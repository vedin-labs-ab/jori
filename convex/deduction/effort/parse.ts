import { isRecord, readCitations, readString } from "../engine/judge"
import { type EffortOp } from "./ops"

// Defensive read of the judge's JSON into typed ops; anything malformed is
// counted, never thrown, so one bad mutation can't sink a pass.
export function readEffortOps(value: Record<string, unknown>): {
  ops: EffortOp[]
  invalid: number
} {
  const mutations = Array.isArray(value.mutations) ? value.mutations : []
  const ops: EffortOp[] = []
  let invalid = 0

  for (const item of mutations) {
    const op = readOp(item)

    if (op === null) {
      invalid += 1
    } else {
      ops.push(op)
    }
  }

  return { ops, invalid }
}

function readOp(item: unknown): EffortOp | null {
  if (!isRecord(item)) {
    return null
  }

  switch (item.op) {
    case "create":
      return readCreate(item)
    case "update":
      return readUpdate(item)
    case "journal":
      return readJournal(item)
    case "merge":
      return readMerge(item)
    default:
      return null
  }
}

function readOpCitations(item: Record<string, unknown>) {
  return readCitations(item.citations, ["event", "conversation"])
}

function readCreate(item: Record<string, unknown>): EffortOp | null {
  const tempId = readString(item.tempId)
  const name = readString(item.name)
  const summary = readString(item.summary)
  const entry = readString(item.entry)

  if (
    tempId === undefined ||
    name === undefined ||
    summary === undefined ||
    entry === undefined
  ) {
    return null
  }

  return {
    op: "create",
    tempId,
    name,
    summary,
    entry,
    citations: readOpCitations(item),
  }
}

function readUpdate(item: Record<string, unknown>): EffortOp | null {
  const effortId = readString(item.effortId)

  if (effortId === undefined) {
    return null
  }

  return {
    op: "update",
    effortId,
    name: readString(item.name),
    summary: readString(item.summary),
    citations: readOpCitations(item),
  }
}

function readJournal(item: Record<string, unknown>): EffortOp | null {
  const effortId = readString(item.effortId)
  const entry = readString(item.entry)

  if (effortId === undefined || entry === undefined) {
    return null
  }

  return { op: "journal", effortId, entry, citations: readOpCitations(item) }
}

function readMerge(item: Record<string, unknown>): EffortOp | null {
  const effortId = readString(item.effortId)
  const into = readString(item.into)

  if (effortId === undefined || into === undefined) {
    return null
  }

  return { op: "merge", effortId, into, citations: readOpCitations(item) }
}
