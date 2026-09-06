import { Marked, type Token } from "marked"

// Jori's replies as marked reads them: GFM, so tables and task lists
// parse, and no HTML — a token is rendered by the walker, never as
// markup, so a reply cannot carry a script or an event handler in.

const marked = new Marked({ gfm: true })

const tableLine = /^\s*\|/

/** The block tokens of a text. While a reply is still streaming, the text
 *  is first completed so a half-written block renders as the block it is
 *  becoming rather than as prose. */
export function parseMarkdown(text: string, streaming = false): Token[] {
  return marked.lexer(streaming ? completeMarkdown(text) : text)
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
