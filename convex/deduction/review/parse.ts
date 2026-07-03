import { type Citation, type JudgeOp } from "./ops"

// Defensive read of the judge's JSON into typed ops. Strict schema output
// makes malformed entries rare; anything that still fails is counted, never
// thrown, so one bad mutation can't sink a pass.
export function readJudgeOps(value: Record<string, unknown>): {
  ops: JudgeOp[]
  invalid: number
} {
  const mutations = Array.isArray(value.mutations) ? value.mutations : []
  const ops: JudgeOp[] = []
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

function readOp(item: unknown): JudgeOp | null {
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
    case "journal":
      return readJournal(item)
    default:
      return null
  }
}

function readCreate(item: Record<string, unknown>): JudgeOp | null {
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
    citations: readCitations(item.citations),
  }
}

function readUpdate(item: Record<string, unknown>): JudgeOp | null {
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
    citations: readCitations(item.citations),
  }
}

function readStatus(item: Record<string, unknown>): JudgeOp | null {
  const beliefId = readString(item.beliefId)
  const to = item.to

  if (
    beliefId === undefined ||
    (to !== "confirm" && to !== "close" && to !== "reject" && to !== "reopen")
  ) {
    return null
  }

  return {
    op: "status",
    beliefId,
    to,
    citations: readCitations(item.citations),
  }
}

function readMerge(item: Record<string, unknown>): JudgeOp | null {
  const beliefId = readString(item.beliefId)
  const into = readString(item.into)

  if (beliefId === undefined || into === undefined) {
    return null
  }

  return {
    op: "merge",
    beliefId,
    into,
    citations: readCitations(item.citations),
  }
}

function readJournal(item: Record<string, unknown>): JudgeOp | null {
  const beliefId = readString(item.beliefId)
  const entry = readString(item.entry)

  if (beliefId === undefined || entry === undefined) {
    return null
  }

  return {
    op: "journal",
    beliefId,
    entry,
    citations: readCitations(item.citations),
  }
}

// Malformed citations are dropped here; ops whose remaining citations cannot
// support them are discarded later by the applier's citation rule.
function readCitations(value: unknown): Citation[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item): Citation[] => {
    if (!isRecord(item)) {
      return []
    }

    const event = readString(item.event)
    const conversation = readString(item.conversation)
    const why = readString(item.why)

    if (event !== undefined && conversation === undefined) {
      return [{ event, why }]
    }

    if (conversation !== undefined && event === undefined) {
      return [{ conversation, why }]
    }

    return []
  })
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.filter((item): item is string => typeof item === "string")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
