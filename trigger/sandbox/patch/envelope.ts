import path from "node:path"
import { sandboxWorkspace } from "../../../contracts/runtime/sandbox"
import { shellQuote } from "../path"
import { type SandboxRuntime, type SandboxWriteFile } from "../types"
import { type Hunk, parseEnvelopePatch } from "./parse"

export function isEnvelopePatch(patch: string) {
  return patch.trimStart().startsWith("*** Begin Patch")
}

export async function applyEnvelopePatch(
  sandbox: SandboxRuntime,
  patch: string,
  cwd: string
) {
  const operations = parseEnvelopePatch(patch)
  const writes: SandboxWriteFile[] = []
  const removals: string[] = []

  for (const operation of operations) {
    const target = resolveTarget(cwd, operation.path)

    if (operation.kind === "add") {
      writes.push({ content: operation.content, path: target })
    } else if (operation.kind === "delete") {
      removals.push(target)
    } else {
      const current = await readCurrentFile(sandbox, target, operation.path)
      const destination =
        operation.moveTo === undefined
          ? target
          : resolveTarget(cwd, operation.moveTo)

      writes.push({
        content: applyHunks(current, operation.hunks, operation.path),
        path: destination,
      })
      if (destination !== target) {
        removals.push(target)
      }
    }
  }

  await writeResults(sandbox, writes, removals)

  return { applied: true, files: operations.map((entry) => entry.path) }
}

/** Replace each hunk's context-plus-removals with its context-plus-adds,
 *  located by matching lines (exact first, then whitespace-lenient). */
export function applyHunks(content: string, hunks: Hunk[], filePath: string) {
  const lines = content.split("\n")
  let cursor = 0

  for (const hunk of hunks) {
    const start = anchorIndex(lines, hunk.anchor, cursor)
    const pattern = hunk.lines
      .filter((line) => line.kind !== "add")
      .map((line) => line.text)
    const replacement = hunk.lines
      .filter((line) => line.kind !== "remove")
      .map((line) => line.text)
    const index =
      pattern.length === 0 ? start : findSequence(lines, pattern, start)

    if (index < 0) {
      throw new Error(`Hunk context not found in ${filePath}.`)
    }

    lines.splice(index, pattern.length, ...replacement)
    cursor = index + replacement.length
  }

  return lines.join("\n")
}

function anchorIndex(lines: string[], anchor: string | null, from: number) {
  if (anchor === null) {
    return from
  }

  const found = lines.findIndex(
    (line, index) => index >= from && line.trim() === anchor
  )

  return found < 0 ? from : found
}

function findSequence(lines: string[], pattern: string[], from: number) {
  const comparators = [
    (a: string, b: string) => a === b,
    (a: string, b: string) => a.trimEnd() === b.trimEnd(),
    (a: string, b: string) => a.trim() === b.trim(),
  ]

  for (const matches of comparators) {
    for (let index = from; index <= lines.length - pattern.length; index++) {
      if (
        pattern.every((text, offset) => matches(lines[index + offset], text))
      ) {
        return index
      }
    }
  }

  return -1
}

function resolveTarget(cwd: string, filePath: string) {
  const normalized = path.posix.normalize(filePath.trim())

  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`Patch path escapes the Jori workspace: ${filePath}`)
  }

  return path.posix.join(cwd, normalized)
}

async function readCurrentFile(
  sandbox: SandboxRuntime,
  target: string,
  original: string
) {
  try {
    return new TextDecoder().decode(await sandbox.readFile(target))
  } catch {
    throw new Error(`Cannot update a missing file: ${original}`)
  }
}

async function writeResults(
  sandbox: SandboxRuntime,
  writes: SandboxWriteFile[],
  removals: string[]
) {
  if (writes.length > 0) {
    await sandbox.writeFiles(writes)
  }

  if (removals.length > 0) {
    await sandbox.runCommand({
      command: `rm -f -- ${removals.map(shellQuote).join(" ")}`,
      cwd: sandboxWorkspace,
      timeoutMs: 30_000,
    })
  }
}
