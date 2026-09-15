import { CoverageError, checkLength, type Section } from "./types"

type Group = { hidden: boolean; unicodeFallback: number }
const destinations = new Set([
  "fonttbl",
  "colortbl",
  "stylesheet",
  "info",
  "pict",
  "object",
  "datastore",
  "themedata",
  "listtable",
  "listoverridetable",
  "xmlnstbl",
  "fldinst",
])

export function extractRtf(bytes: Uint8Array): Section[] {
  const source = new TextDecoder("windows-1252").decode(bytes)
  if (!source.startsWith("{\\rtf")) {
    throw new CoverageError("failed", "The RTF document is damaged.")
  }
  const reader = new RtfReader(source)
  return [{ text: reader.read(), label: "Document content" }]
}

class RtfReader {
  private readonly groups: Group[] = [{ hidden: false, unicodeFallback: 1 }]
  private readonly output: string[] = []
  private readonly token = /([a-z]+)(-?\d+)? ?|'([0-9a-f]{2})|(.)/iy
  private cursor = 0
  private fallback = 0
  constructor(private readonly source: string) {}

  read() {
    while (this.cursor < this.source.length) {
      this.consume(this.source[this.cursor++])
      checkLength(this.output.length)
    }
    if (this.groups.length !== 1) {
      throw new CoverageError("failed", "The RTF document is damaged.")
    }
    const text = this.output.join("")
    checkLength(text.length)
    return text
  }

  private consume(character: string) {
    const group = this.groups.at(-1)
    if (group === undefined) {
      throw new CoverageError("failed", "The RTF document is damaged.")
    }
    if (character === "{") {
      if (this.groups.length > 100) {
        throw new CoverageError(
          "too_large",
          "The RTF document exceeds the nesting limit."
        )
      }
      this.groups.push({ ...group })
    } else if (character === "}") {
      this.groups.pop()
    } else if (character === "\\") {
      this.escape(group)
    } else if (character !== "\r" && character !== "\n") {
      this.append(group.hidden ? "" : character)
    }
  }

  private append(value: string) {
    if (this.fallback > 0) {
      this.fallback--
    } else if (value) {
      this.output.push(value)
    }
  }

  private escape(group: Group) {
    this.token.lastIndex = this.cursor
    const token = this.token.exec(this.source)
    if (token === null) {
      return
    }
    this.cursor = this.token.lastIndex
    const value = control(group, token)
    if (token[1] === "bin") {
      this.cursor += Math.max(0, Number(token[2]) || 0)
    }
    if (token[1] === "u") {
      this.fallback = group.unicodeFallback
      this.output.push(value)
    } else if (value) {
      this.append(value)
    }
  }
}

function control(group: Group, token: RegExpExecArray) {
  const [, word, number, hex, symbol] = token
  if (symbol === "*" || destinations.has(word)) {
    group.hidden = true
  }
  if (group.hidden) {
    return ""
  }
  if (word === "ansicpg" && Number(number) !== 1252) {
    throw new CoverageError(
      "unsupported",
      "This RTF text encoding is not supported."
    )
  }
  if (word === "uc") {
    group.unicodeFallback = Math.max(0, Number(number) || 0)
  }
  if (word === "u") {
    return String.fromCharCode(Number(number) & 0xffff)
  }
  if (hex) {
    return new TextDecoder("windows-1252").decode(
      new Uint8Array([Number.parseInt(hex, 16)])
    )
  }
  if (symbol === "\\" || symbol === "{" || symbol === "}") {
    return symbol
  }
  if (symbol === "~") {
    return " "
  }
  if (word === "par" || word === "line") {
    return "\n"
  }
  if (word === "tab") {
    return "\t"
  }
  return ""
}
