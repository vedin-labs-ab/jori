import { isRecord } from "../../../contracts/json"
import {
  readCitations,
  readOps,
  readString,
  readStringList,
} from "../engine/judge"
import { type WorkstreamOp } from "./contract"

export function readWorkstreamOps(value: Record<string, unknown>) {
  return readOps(value, readOp)
}

function readOp(item: unknown): WorkstreamOp | null {
  if (!isRecord(item)) {
    return null
  }

  switch (item.op) {
    case "create":
      return readCreate(item)
    case "update":
      return readUpdate(item)
    case "status":
      return readStatus(item)
    case "merge":
      return readMerge(item)
    case "assign":
      return readAssign(item)
    default:
      return null
  }
}

function readOpCitations(item: Record<string, unknown>) {
  return readCitations(item.citations, ["effort"])
}

function readCreate(item: Record<string, unknown>): WorkstreamOp | null {
  const tempId = readString(item.tempId)
  const name = readString(item.name)
  const brief = readString(item.brief)

  if (tempId === undefined || name === undefined || brief === undefined) {
    return null
  }

  return {
    op: "create",
    tempId,
    name,
    aliases: readStringList(item.aliases) ?? [],
    brief,
    parentId: readString(item.parentId),
    citations: readOpCitations(item),
  }
}

function readUpdate(item: Record<string, unknown>): WorkstreamOp | null {
  const beliefId = readString(item.beliefId)

  if (beliefId === undefined) {
    return null
  }

  return {
    op: "update",
    beliefId,
    name: readString(item.name),
    aliases: readStringList(item.aliases),
    brief: readString(item.brief),
    parentId: readString(item.parentId),
    citations: readOpCitations(item),
  }
}

function readStatus(item: Record<string, unknown>): WorkstreamOp | null {
  const beliefId = readString(item.beliefId)
  const to = item.to

  if (
    beliefId === undefined ||
    (to !== "confirm" && to !== "close" && to !== "reject" && to !== "reopen")
  ) {
    return null
  }

  return { op: "status", beliefId, to, citations: readOpCitations(item) }
}

function readMerge(item: Record<string, unknown>): WorkstreamOp | null {
  const beliefId = readString(item.beliefId)
  const into = readString(item.into)

  if (beliefId === undefined || into === undefined) {
    return null
  }

  return { op: "merge", beliefId, into, citations: readOpCitations(item) }
}

function readAssign(item: Record<string, unknown>): WorkstreamOp | null {
  const effortId = readString(item.effortId)
  const beliefId = readString(item.beliefId)

  if (effortId === undefined || beliefId === undefined) {
    return null
  }

  return { op: "assign", effortId, beliefId, why: readString(item.why) }
}
