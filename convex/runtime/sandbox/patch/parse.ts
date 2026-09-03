// Parser for the "*** Begin Patch" envelope models are trained to emit for a
// tool named apply_patch: whole-file adds and deletes, plus context-anchored
// update hunks without line numbers.

type HunkLine = { kind: "add" | "context" | "remove"; text: string }
export type Hunk = { anchor: string | null; lines: HunkLine[] }

type EnvelopeOp =
  | { kind: "add"; path: string; content: string }
  | { kind: "delete"; path: string }
  | { kind: "update"; path: string; moveTo?: string; hunks: Hunk[] }

export function parseEnvelopePatch(patch: string): EnvelopeOp[] {
  const lines = patch.trim().split("\n")

  if (lines[0]?.trim() !== "*** Begin Patch") {
    throw new Error('Envelope patches must start with "*** Begin Patch".')
  }

  const operations: EnvelopeOp[] = []
  let index = 1

  while (index < lines.length && lines[index].trim() !== "*** End Patch") {
    const [operation, next] = parseOperation(lines, index)
    operations.push(operation)
    index = next
  }

  if (operations.length === 0) {
    throw new Error("The patch contains no file operations.")
  }

  return operations
}

function parseOperation(
  lines: string[],
  index: number
): [operation: EnvelopeOp, next: number] {
  const line = lines[index]
  const added = directive(line, "Add File")

  if (added !== null) {
    const [content, next] = parseAddedContent(lines, index + 1)

    return [{ kind: "add", path: added, content }, next]
  }

  const deleted = directive(line, "Delete File")

  if (deleted !== null) {
    return [{ kind: "delete", path: deleted }, index + 1]
  }

  const updated = directive(line, "Update File")

  if (updated !== null) {
    return parseUpdate(lines, index + 1, updated)
  }

  throw new Error(`Unrecognized patch line: ${line}`)
}

function directive(line: string, name: string) {
  const prefix = `*** ${name}: `

  return line.startsWith(prefix) ? line.slice(prefix.length).trim() : null
}

function parseAddedContent(
  lines: string[],
  start: number
): [content: string, next: number] {
  const content: string[] = []
  let index = start

  while (index < lines.length && !lines[index].startsWith("*** ")) {
    const line = lines[index]

    if (line.startsWith("+")) {
      content.push(line.slice(1))
    } else if (line === "") {
      content.push("")
    } else {
      throw new Error(`Added lines must start with "+": ${line}`)
    }

    index += 1
  }

  return [`${content.join("\n")}\n`, index]
}

function parseUpdate(
  lines: string[],
  start: number,
  filePath: string
): [operation: EnvelopeOp, next: number] {
  let index = start
  const moveTo = directive(lines[index] ?? "", "Move to") ?? undefined

  if (moveTo !== undefined) {
    index += 1
  }

  const [hunks, next] = parseHunks(lines, index)

  if (hunks.every((hunk) => hunk.lines.length === 0)) {
    throw new Error(`Update for ${filePath} contains no changes.`)
  }

  return [{ kind: "update", path: filePath, moveTo, hunks }, next]
}

function parseHunks(
  lines: string[],
  start: number
): [hunks: Hunk[], next: number] {
  const hunks: Hunk[] = []
  let index = start

  while (index < lines.length) {
    const line = lines[index]

    if (line.startsWith("*** ") && line.trim() !== "*** End of File") {
      break
    }

    if (line.startsWith("@@")) {
      hunks.push({ anchor: line.slice(2).trim() || null, lines: [] })
    } else if (line.trim() !== "*** End of File") {
      if (hunks.length === 0) {
        hunks.push({ anchor: null, lines: [] })
      }
      hunks[hunks.length - 1].lines.push(hunkLine(line))
    }

    index += 1
  }

  return [hunks, index]
}

function hunkLine(line: string): HunkLine {
  if (line.startsWith("+")) {
    return { kind: "add", text: line.slice(1) }
  }

  if (line.startsWith("-")) {
    return { kind: "remove", text: line.slice(1) }
  }

  if (line.startsWith(" ") || line === "") {
    return { kind: "context", text: line.slice(1) }
  }

  throw new Error(`Unrecognized hunk line: ${line}`)
}
