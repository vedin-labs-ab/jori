import { Marked, type Token } from "marked"

// Jori's replies as marked reads them: GFM, so tables and task lists
// parse, and no HTML — a token is rendered by the walker, never as
// markup, so a reply cannot carry a script or an event handler in.

const marked = new Marked({ gfm: true })

const tableLine = /^\s*\|/
const blankLine = /^\s*$/
const fenceLine = /^ {0,3}(`{3,}|~{3,})/
/** A line that continues the block above a blank line: another item of
 *  its list, or a paragraph indented under its item. */
const continuationLine = /^(?:\s|[-*+](?:\s|$)|\d{1,9}[.)](?:\s|$))/

/** The block tokens of a text. While a reply is still streaming, the text
 *  is first completed so a half-written block renders as the block it is
 *  becoming rather than as prose. */
export function parseMarkdown(text: string, streaming = false): Token[] {
  return marked.lexer(streaming ? completeMarkdown(text) : text)
}

/**
 * The block tokens of a streaming text, lexed as it grows: what is
 * settled is lexed once and kept, and each call lexes the tail past it
 * alone, so a reply's cost per write is its last block rather than its
 * length. A text that is not a continuation starts over.
 */
export function createStreamingParser() {
  let settled = ""
  let tokens: Token[] = []

  return (text: string): Token[] => {
    const prefix = text.slice(0, settledLength(text))

    if (!prefix.startsWith(settled)) {
      settled = ""
      tokens = []
    }

    if (prefix.length > settled.length) {
      tokens = [...tokens, ...marked.lexer(prefix.slice(settled.length))]
      settled = prefix
    }

    return [...tokens, ...parseMarkdown(text.slice(prefix.length), true)]
  }
}

/**
 * How much of a streaming text later writes cannot change: up to and
 * including its last blank line that stands outside a fence, has a line
 * after it, and is not followed by a line that continues the block above
 * — another item of a list, or a paragraph indented under one. A table
 * ends at a blank line, so no table is cut; a fence runs to its closing
 * line, so none is either.
 */
export function settledLength(text: string) {
  const lines = text.split("\n")
  let fence: { char: string; length: number } | null = null
  let offset = 0
  let settled = 0

  for (const [index, line] of lines.entries()) {
    offset += line.length + 1
    fence = fenceAfter(fence, line)

    if (fence === null && blankLine.test(line)) {
      const next = lines
        .slice(index + 1)
        .find((later) => !blankLine.test(later))

      if (next !== undefined && !continuationLine.test(next)) {
        settled = offset
      }
    }
  }

  return settled
}

function fenceAfter(
  fence: { char: string; length: number } | null,
  line: string
) {
  const match = fenceLine.exec(line)

  if (match?.[1] === undefined) {
    return fence
  }

  const char = match[1][0] ?? ""
  const length = match[1].length

  if (fence === null) {
    return { char, length }
  }

  return fence.char === char &&
    length >= fence.length &&
    line.trim() === match[1]
    ? null
    : fence
}

/** Closes what streaming has left open. A fence without its closing line
 *  already runs to the end of the text, as the spec has it; a table's
 *  header without the delimiter row under it would read as a paragraph,
 *  so the row is supplied and the header reads as a table already, with
 *  its rows filling in below. */
export function completeMarkdown(text: string) {
  const lines = text.split("\n")
  const last = lines.at(-1)
  const previous = lines.at(-2)

  if (
    last !== undefined &&
    tableLine.test(last) &&
    (previous === undefined || !tableLine.test(previous))
  ) {
    return `${text}\n${delimiterRow(last)}`
  }

  return text
}

function delimiterRow(header: string) {
  const cells = header.trim().replace(/^\|/, "").replace(/\|$/, "").split("|")

  return `|${cells.map(() => " --- ").join("|")}|`
}
