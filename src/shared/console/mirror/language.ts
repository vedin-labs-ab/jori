import { HighlightStyle, LanguageDescription } from "@codemirror/language"
import { languages } from "@codemirror/language-data"
import { tags } from "@lezer/highlight"

/** Maps syntax tags onto the hljs class names the console already colors
 *  (shared/tokens.ts and the editor's own additions), so highlighted code
 *  matches every other code surface in both themes. */
export const highlight = HighlightStyle.define([
  { tag: [tags.string, tags.special(tags.string)], class: "hljs-string" },
  { tag: tags.number, class: "hljs-number" },
  { tag: [tags.bool, tags.null, tags.atom], class: "hljs-literal" },
  { tag: [tags.propertyName, tags.attributeName], class: "hljs-attr" },
  {
    tag: [tags.keyword, tags.operatorKeyword, tags.modifier],
    class: "hljs-keyword",
  },
  {
    tag: [tags.typeName, tags.className, tags.tagName, tags.heading],
    class: "hljs-title",
  },
  { tag: [tags.comment, tags.meta], class: "hljs-comment" },
])

/** Picks the file's language from the bundled catalog: the filename decides
 *  first (extension registry), then the mime subtype ("application/json" →
 *  json, "text/x-python" → python). Unmatched files stay plain text. */
export function resolveLanguage(
  name: string,
  mimeType: string,
  catalog: readonly LanguageDescription[] = languages
) {
  return (
    LanguageDescription.matchFilename(catalog, name) ??
    matchMime(catalog, mimeType)
  )
}

/** Loads the resolved language's support lazily, or nothing for plain
 *  text. Each description pulls its parser on first use, so the ~150
 *  bundled languages cost nothing until a file needs one. */
export async function loadLanguage(name: string, mimeType: string) {
  const description = resolveLanguage(name, mimeType)

  return description === null ? undefined : await description.load()
}

function matchMime(catalog: readonly LanguageDescription[], mimeType: string) {
  const word = mimeWord(mimeType)

  return word === ""
    ? null
    : LanguageDescription.matchLanguageName(catalog, word, true)
}

/** The language-shaped word inside a mime type: the subtype, minus the
 *  structured-syntax prefixes and suffixes ("text/x-python" → "python",
 *  "application/ld+json" → "json"). */
function mimeWord(mimeType: string) {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? ""
  const subtype = base.split("/")[1] ?? ""
  const suffix = subtype.split("+").pop() ?? subtype

  return suffix.replace(/^x-/, "")
}
