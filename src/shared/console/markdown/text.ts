import { type Token } from "marked"

// What the walkers share about a token's text: the runs it holds, and
// the entities marked leaves as written for the renderer to resolve.

/** The runs a token holds, for the kinds that hold any. */
export function childTokens(token: Token) {
  return "tokens" in token ? token.tokens : undefined
}

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
}

/** marked leaves a text run's entities as written and escapes the rest at
 *  render time; under React the run is text already, so the entities are
 *  the one thing left to resolve. */
export function decodeEntities(text: string) {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (entity: string, body: string) => {
      if (body.startsWith("#x") || body.startsWith("#X")) {
        return String.fromCodePoint(Number.parseInt(body.slice(2), 16))
      }

      if (body.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(body.slice(1), 10))
      }

      return namedEntities[body.toLowerCase()] ?? entity
    }
  )
}
