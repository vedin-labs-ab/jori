/**
 * Reads the `text` of a `send_reply` call out of its JSON arguments as they
 * arrive, so a draft can show the words before the call is whole. The
 * scanner trusts `text` to be the object's first property, decodes escapes
 * only once they are complete, and gives up for good at the first sign of
 * anything else: the draft is a preview, and the finished call is the
 * message.
 */
export type ReplyScan =
  | { state: "abandoned" }
  | { state: "done" | "open"; text: string }

type PrefixPhase = "object" | "quote" | "colon" | "value"
type Phase = PrefixPhase | "key" | "text" | "done" | "abandoned"

const expectedKey = "text"
const escapeLength = 2
const unicodeEscapeLength = 6
const escapes: Record<string, string> = {
  '"': '"',
  "/": "/",
  "\\": "\\",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
}

// Each phase before the text waits through whitespace for one character.
const prefixSteps: Record<PrefixPhase, { expect: string; next: Phase }> = {
  colon: { expect: ":", next: "value" },
  object: { expect: "{", next: "quote" },
  quote: { expect: '"', next: "key" },
  value: { expect: '"', next: "text" },
}

export function createReplyScanner() {
  return new ReplyScanner()
}

class ReplyScanner {
  private phase: Phase = "object"
  private key = ""
  private escape = ""
  private text = ""

  push(fragment: string): ReplyScan {
    for (const char of fragment) {
      if (this.phase === "done" || this.phase === "abandoned") {
        break
      }

      this.phase = this.scan(char)
    }

    if (this.phase === "abandoned") {
      return { state: "abandoned" }
    }

    return {
      state: this.phase === "done" ? "done" : "open",
      text: this.committed(),
    }
  }

  private scan(char: string): Phase {
    if (this.phase === "text") {
      return this.escape === "" ? this.scanText(char) : this.scanEscape(char)
    }

    if (this.phase === "key") {
      return this.scanKey(char)
    }

    const step = prefixSteps[this.phase as PrefixPhase]

    if (char === step.expect) {
      return step.next
    }

    return isWhitespace(char) ? this.phase : "abandoned"
  }

  private scanKey(char: string): Phase {
    if (char === '"') {
      return this.key === expectedKey ? "colon" : "abandoned"
    }

    this.key += char

    return expectedKey.startsWith(this.key) ? "key" : "abandoned"
  }

  private scanText(char: string): Phase {
    if (char === "\\") {
      this.escape = char

      return "text"
    }

    if (char === '"') {
      return "done"
    }

    this.append(char)

    return "text"
  }

  private scanEscape(char: string): Phase {
    this.escape += char

    if (this.escape.length === escapeLength) {
      return char === "u" ? "text" : this.finishEscape(escapes[char])
    }

    if (!isHexDigit(char)) {
      return "abandoned"
    }

    if (this.escape.length < unicodeEscapeLength) {
      return "text"
    }

    return this.finishEscape(
      String.fromCharCode(Number.parseInt(this.escape.slice(2), 16))
    )
  }

  private finishEscape(decoded: string | undefined): Phase {
    if (decoded === undefined) {
      return "abandoned"
    }

    this.escape = ""
    this.append(decoded)

    return "text"
  }

  // Surrogates only ever land in pairs: a high one waits at the end of the
  // text for its low one and is dropped by anything else, and a low one
  // without its high one is dropped on arrival.
  private append(value: string) {
    const trailing = this.text.charCodeAt(this.text.length - 1)
    const leading = value.charCodeAt(0)

    if (isHighSurrogate(trailing) && !isLowSurrogate(leading)) {
      this.text = this.text.slice(0, -1)
    }

    if (isLowSurrogate(leading) && !isHighSurrogate(trailing)) {
      return
    }

    this.text += value
  }

  private committed() {
    return isHighSurrogate(this.text.charCodeAt(this.text.length - 1))
      ? this.text.slice(0, -1)
      : this.text
  }
}

function isWhitespace(char: string) {
  return char === " " || char === "\n" || char === "\r" || char === "\t"
}

function isHexDigit(char: string) {
  return /^[0-9a-fA-F]$/.test(char)
}

function isHighSurrogate(code: number) {
  return code >= 0xd800 && code <= 0xdbff
}

function isLowSurrogate(code: number) {
  return code >= 0xdc00 && code <= 0xdfff
}
