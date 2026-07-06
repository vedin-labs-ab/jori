import { isRecord } from "../../../contracts/json"
import { readCitations, readOps, readString } from "../engine/judge"
import { type EffortOp } from "./ops"

// Narrated dates are metadata (`observedAt`), never entry prose. Models
// drift toward date-prefixed entries when history shows dated lines, so a
// leading date or date range is stripped at the wire, whatever the charter
// says.
const entryDatePrefix =
  /^\s*\d{4}-\d{2}-\d{2}(?:\s*(?:to|through|[–—-])\s*\d{4}-\d{2}-\d{2})?\s*[:–—-]\s*/

export function readEntry(value: unknown) {
  const entry = readString(value)?.replace(entryDatePrefix, "")

  return entry === undefined || entry === "" ? undefined : entry
}

export function readEffortOps(value: Record<string, unknown>) {
  return readOps(value, readOp)
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
  const entry = readEntry(item.entry)

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
  const entry = readEntry(item.entry)

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
