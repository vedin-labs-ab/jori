import { marked, type Token, type Tokens } from "marked"

// These bodies remain untrusted tool data. Filtering hidden content is only
// hygiene; it does not make instructions written in an issue authoritative.
export function visibleGitHubBody(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const text = value.replace(
    /[\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu,
    ""
  )
  return render(marked.lexer(text))
}

function render(tokens: Token[]): string {
  return tokens.map(visibleToken).join("")
}

function visibleToken(token: Token): string {
  switch (token.type) {
    case "image":
      return `![](<${token.href}>)`
    case "html":
      return token.raw
        .replace(/<!--(?:>|->|[\s\S]*?(?:--!?>|$))/g, "")
        .replace(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, "[Image]")
    case "blockquote": {
      const body = render(token.tokens ?? [])
      return body === token.text ? token.raw : body.replace(/^/gm, "> ")
    }
    case "list":
      return replaceChildren(token.raw, token.items)
    case "list_item": {
      const body = render(token.tokens ?? [])
      const original = (token.tokens ?? [])
        .map((child: Token) => child.raw)
        .join("")
      if (body === original) {
        return token.raw
      }
      const prefix = token.raw.match(/^\s*(?:[-+*]|\d+[.)])\s+/)?.[0] ?? "- "
      return prefix + body.replace(/\n(?=.)/g, `\n${" ".repeat(prefix.length)}`)
    }
    case "table":
      return replaceChildren(
        token.raw,
        [token.header, ...token.rows].flatMap((row: Tokens.TableCell[]) =>
          row.flatMap((cell) => cell.tokens)
        )
      )
    default:
      return "tokens" in token && Array.isArray(token.tokens)
        ? replaceChildren(token.raw, token.tokens)
        : token.raw
  }
}

function replaceChildren(source: string, tokens: Token[]) {
  let result = ""
  let cursor = 0
  for (const token of tokens) {
    const start = source.indexOf(token.raw, cursor)
    if (start < 0) {
      continue
    }
    result += source.slice(cursor, start) + visibleToken(token)
    cursor = start + token.raw.length
  }
  return result + source.slice(cursor)
}
