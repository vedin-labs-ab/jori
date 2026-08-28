import {
  extensionKinds,
  type FileKind,
  kinds,
  mimeKinds,
  prefixKinds,
} from "./formats"

export type { FileCategory, FileKind } from "./formats"

/** Mime types that carry no real signal — many uploads arrive as
 *  octet-stream — so the file extension decides instead. */
const genericMimes = new Set([
  "",
  "application/binary",
  "application/octet-stream",
  "application/unknown",
  "binary/octet-stream",
  "text/plain",
])

/** The display kind of a stored file. The mime type is the primary signal;
 *  the file extension breaks ties and fills gaps when the mime type is
 *  generic or unknown. Always resolves, ending in a plain binary kind. */
export function fileKind(mimeType: string, name: string): FileKind {
  const mime = normalizeMime(mimeType)
  const extension = fileExtension(name)

  if (genericMimes.has(mime)) {
    return extensionKinds.get(extension) ?? plainKind(mime)
  }

  return (
    mimeKinds.get(mime) ??
    prefixKinds.get(mimePrefix(mime)) ??
    suffixKind(mime) ??
    extensionKinds.get(extension) ??
    kinds.binary
  )
}

/** Registry categories rendered as monospace text: plain text, structured
 *  text (JSON, CSV, YAML, …), and code. */
const textualCategories = new Set(["code", "data", "text"])

/** True when the registry reads the file as text a person could open in an
 *  editor — the files worth previewing and copying as text. */
export function isTextualKind(mimeType: string, name: string) {
  return textualCategories.has(fileKind(mimeType, name).category)
}

/** Strips parameters like "; charset=utf-8" before matching. */
function normalizeMime(mimeType: string) {
  return (mimeType.split(";")[0] ?? "").trim().toLowerCase()
}

function mimePrefix(mime: string) {
  return mime.split("/")[0] ?? ""
}

function fileExtension(name: string) {
  const dot = name.lastIndexOf(".")

  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase()
}

/** A generic mime with no rescuing extension is plain text or a bare file. */
function plainKind(mime: string) {
  return mime === "text/plain" ? kinds.text : kinds.binary
}

/** Structured-syntax suffixes on vendor types, e.g. application/ld+json. */
function suffixKind(mime: string) {
  if (mime.endsWith("+json")) {
    return kinds.json
  }

  if (mime.endsWith("+xml")) {
    return kinds.xml
  }

  if (mime.endsWith("+zip") || mime.endsWith("+gzip")) {
    return kinds.archive
  }

  return undefined
}
