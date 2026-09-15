import {
  CoverageError,
  checkLength,
  type Extraction,
  type Section,
} from "../types"

type Kind = "image" | "pdf" | "audio" | "doc"
const coverage = {
  image: "ocr",
  pdf: "ocr",
  audio: "transcript",
  doc: "complete",
} as const

export function readResult(contents: string, kind: Kind): Extraction {
  const lines = contents.trim().split("\n")
  if (lines[0] !== '{"partial":true}' || lines.length > 8192) {
    throw invalid()
  }
  const sections: Section[] = []
  let length = 0
  let complete = false
  let reason: string | undefined
  for (const line of lines.slice(1)) {
    const value = readObject(line)
    if ("error" in value) {
      const error = failure(value.error)
      if (!sections.length) {
        throw error
      }
      reason = error.message
      break
    }
    if ("complete" in value) {
      complete = value.complete === true
      break
    }
    const section = readSection(value, kind)
    length += section.text.length
    checkLength(length)
    if (value.unavailable === true) {
      reason = "Some pages exceeded the OCR limits."
    }
    sections.push(section)
  }
  if (!complete || reason) {
    return {
      sections,
      coverage: "partial",
      reason: reason ?? "Extraction reached its processing limit.",
    }
  }
  return {
    sections,
    coverage: coverage[kind],
  }
}

function readObject(line: string): Record<string, unknown> {
  const value: unknown = JSON.parse(line)
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid()
  }
  return value as Record<string, unknown>
}

function readSection(value: Record<string, unknown>, kind: Kind): Section {
  if (typeof value.text !== "string") {
    throw invalid()
  }
  const page = number(value.page, 1, 1000)
  if (page !== undefined && !Number.isInteger(page)) {
    throw invalid()
  }
  const seconds = number(value.seconds, 0, 1800)
  const label =
    kind === "audio"
      ? "Machine transcript"
      : kind === "doc"
        ? "Document content"
        : page
          ? `Page ${page}, OCR`
          : "Image text, OCR"
  return {
    text: value.text,
    label,
    ...(page === undefined ? {} : { page }),
    ...(seconds === undefined ? {} : { seconds }),
  }
}

function number(value: unknown, minimum: number, maximum: number) {
  if (value === undefined) {
    return undefined
  }
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw invalid()
  }
  return value
}

function failure(reason: unknown) {
  if (reason === "frames") {
    return new CoverageError(
      "unsupported",
      "Multi-frame images are not supported."
    )
  }
  if (reason === "encrypted") {
    return new CoverageError(
      "unsupported",
      "Encrypted documents require an unlocked copy."
    )
  }
  return new CoverageError(
    reason === "limit" ? "too_large" : "failed",
    "Extraction reached a processing limit or could not read the document."
  )
}
function invalid() {
  return new CoverageError("failed", "Invalid extraction result.")
}
