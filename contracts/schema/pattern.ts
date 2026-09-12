import { RE2JS } from "re2js"

const maxPatternLength = 512

/** Authored patterns use RE2-compatible Unicode syntax and unanchored search.
 * Unlike ECMAScript, $ means strict end, dot excludes LF only, and \s is ASCII.
 * Lookarounds, backreferences and unsupported Unicode groups are rejected.
 * Parse with the native engine for syntax only; never execute untrusted regex. */
export function compileSchemaPattern(pattern: string) {
  if (pattern.length > maxPatternLength) {
    throw new Error(`patterns must be at most ${maxPatternLength} characters`)
  }
  try {
    const syntax = new RegExp(pattern, "u")
    return RE2JS.compile(RE2JS.translateRegExp(syntax))
  } catch {
    throw new Error(
      "uses an unsupported pattern; use RE2-compatible Unicode syntax without lookarounds or backreferences"
    )
  }
}

export function schemaPatternIssue(pattern: unknown): string | undefined {
  if (pattern === undefined) {
    return undefined
  }
  if (typeof pattern !== "string") {
    return "pattern must be a string"
  }
  try {
    compileSchemaPattern(pattern)
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : "uses an invalid pattern"
  }
}
