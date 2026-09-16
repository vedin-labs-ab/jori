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
function isTextualKind(mimeType: string, name: string) {
  return textualCategories.has(fileKind(mimeType, name).category)
}

/** True when the file is an HTML document a browser can render — the mime
 *  type says text/html, or a generic mime leaves an .html/.htm extension
 *  to decide. */
export function isHtmlFile(mimeType: string, name: string) {
  return fileKind(mimeType, name) === kinds.html
}

/** Office Open XML workbooks, the one spreadsheet format the inline sheet
 *  view reads. Legacy binary .xls stays a download. */
const workbookMimes = new Set([
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])
const workbookExtensions = new Set(["xlsm", "xlsx"])

/** True when the file is a workbook the sheet view can open: by mime type,
 *  or by extension when the mime type is generic. */
export function isWorkbookFile(mimeType: string, name: string) {
  const mime = normalizeMime(mimeType)

  return (
    workbookMimes.has(mime) ||
    (genericMimes.has(mime) && workbookExtensions.has(fileExtension(name)))
  )
}

export type PreviewKind =
  | "audio"
  | "image"
  | "none"
  | "pdf"
  | "sheet"
  | "text"
  | "video"

/** How a browser can present the file inline. Browsers render media by the
 *  served mime type, so those stay mime-only; text and workbooks are
 *  fetched by hand, so the registry's read of the file — extension rescue
 *  included — decides what counts. */
export function previewKind(mimeType: string, name: string): PreviewKind {
  const mime = normalizeMime(mimeType)

  if (mime.startsWith("image/")) {
    return "image"
  }

  if (mime === "application/pdf") {
    return "pdf"
  }

  if (mime.startsWith("video/")) {
    return "video"
  }

  if (mime.startsWith("audio/")) {
    return "audio"
  }

  if (isWorkbookFile(mimeType, name)) {
    return "sheet"
  }

  return isTextualKind(mimeType, name) ? "text" : "none"
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
