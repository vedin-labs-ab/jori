import { type Hit } from "@contracts/discovery"
import { collapseWhitespace } from "@contracts/text"

export function resultDetail(hit: Hit, query: string) {
  const { kind, location } = hit
  const snippet = resultSnippet(hit, query)
  const parent = hit.title !== hit.resourceName ? hit.resourceName : undefined
  const label = locationLabel(hit)
  // A row's snippet names its own columns; a table's header match does not.
  const field =
    kind === "table" &&
    location.kind !== "row" &&
    snippet &&
    (location.start ?? 0) > hit.resourceName.length
      ? "Column"
      : undefined
  const detail = field && snippet ? `${field}: ${snippet}` : snippet
  const coverage = hit.coverage && coverageLabels[hit.coverage]
  const context = [parent, coverage, field ? undefined : label]
    .filter(Boolean)
    .join(", ")
  return [context, detail].filter(Boolean).join(" · ")
}

function resultSnippet(hit: Hit, query: string) {
  const { kind, location } = hit
  const titleMatch = contains(hit.title, query)
  const nameOnly =
    location.kind === "resource" &&
    (location.field === "name" ||
      location.field === "title" ||
      ((kind === "table" || kind === "store") && titleMatch))
  let snippet = nameOnly ? "" : displayText(hit, hit.snippet)
  if (
    [hit.title, hit.resourceName, location.label].some(
      (value) =>
        value && displayText(hit, value) === snippet.replace(/^…|…$/g, "")
    )
  ) {
    snippet = ""
  }
  // A title match doesn't make an unrelated tool payload useful to read.
  if (
    kind === "run" &&
    titleMatch &&
    (location.kind === "resource" ||
      !contains(snippet.replace(hit.title, ""), query))
  ) {
    snippet = ""
  }
  return kind === "table" && location.kind === "resource"
    ? snippet.replace(/^…|…$/g, "")
    : snippet
}

function locationLabel({ location }: Hit) {
  if (location.seconds !== undefined) {
    const seconds = Math.floor(location.seconds)
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
  }
  if (location.sheet) {
    return `Sheet ${location.sheet}${location.cell ? `, ${location.cell}` : ""}`
  }
  if (location.page !== undefined) {
    return `Page ${location.page}`
  }
  return [
    "File content",
    "Store value",
    "Run activity",
    "Document content",
    "Machine transcript",
    "Image text, OCR",
  ].includes(location.label ?? "")
    ? undefined
    : location.label
}

function contains(text: string, query: string) {
  return (
    Boolean(query.trim()) &&
    text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  )
}

/** Strip common prose decoration, never render source markup as HTML. */
function displayText(hit: Hit, text: string) {
  if (
    hit.kind === "file" &&
    !/\.(?:md|mdx|markdown)$/i.test(hit.resourceName)
  ) {
    return collapseWhitespace(text)
  }
  return collapseWhitespace(
    text
      .replace(/(^|\n)\s{0,3}(?:#{1,6}\s+|>\s+|[-*+]\s+)/g, "$1")
      .replace(/(\*\*|__|~~|`)(\S(?:.*?\S)?)\1/g, "$2")
      .replace(/(^|[\s…])\*(\S(?:.*?\S)?)\*(?=[\s.,!?…]|$)/g, "$1$2")
  )
}

const coverageLabels: Record<string, string> = {
  partial: "Partial text",
  ocr: "OCR",
  transcript: "Transcript",
  unsupported: "Name only",
  too_large: "Name only",
  failed: "Text unavailable",
  empty: "No searchable text",
}
