import { v } from "convex/values"

export const section = v.object({
  text: v.string(),
  label: v.optional(v.string()),
  page: v.optional(v.number()),
  seconds: v.optional(v.number()),
  start: v.optional(v.number()),
  end: v.optional(v.number()),
  sheet: v.optional(v.string()),
  cell: v.optional(v.string()),
})

export type Section = {
  text: string
  label?: string
  page?: number
  seconds?: number
  /** UTF-16 offsets in the decoded text, relative to the page when present. */
  start?: number
  end?: number
  sheet?: string
  cell?: string
}

export type Coverage =
  | "complete"
  | "partial"
  | "ocr"
  | "transcript"
  | "unsupported"
  | "too_large"
  | "failed"
  | "empty"
export type Extraction = {
  sections: Section[]
  coverage: Coverage
  reason?: string
  retryable?: boolean
}

export class CoverageError extends Error {
  constructor(
    readonly coverage: Coverage,
    message: string
  ) {
    super(message)
  }
}

export function checkLength(length: number) {
  if (length > 2_000_000) {
    throw new CoverageError(
      "too_large",
      "The document exceeds two million extracted characters."
    )
  }
}

/** Keep the action result below Convex's serialized value limit, including CJK
 * and emoji. A shortened result is useful only when its coverage says so. */
export function bounded(result: Extraction): Extraction {
  const sections: Section[] = []
  const encoder = new TextEncoder()
  let remaining = 600_000
  let partial = false
  const items = result.sections.filter((item) => item.text.trim())
  for (const item of items) {
    const section = { ...item, label: item.label?.slice(0, 120) }
    let size = encoder.encode(JSON.stringify(section)).length
    if (size > remaining) {
      section.text = fittingText(section, remaining)
      adjustEnd(section)
      size = encoder.encode(JSON.stringify(section)).length
      partial = true
    }
    if (section.text.trim()) {
      sections.push(section)
    }
    remaining -= size
    if (partial || sections.length >= 1500) {
      partial ||= items.length > sections.length
      break
    }
  }
  if (partial) {
    return {
      sections,
      coverage: "partial",
      reason: "Content exceeded the 600 KB or 1,500 section extraction limit.",
    }
  }
  if (
    sections.length === 0 &&
    ["complete", "ocr", "transcript"].includes(result.coverage)
  ) {
    return { sections, coverage: "empty" }
  }
  return { ...result, sections }
}

function fittingText(section: Section, remaining: number) {
  const encoder = new TextEncoder()
  let low = 0
  let high = section.text.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const bytes = encoder.encode(
      JSON.stringify({ ...section, text: section.text.slice(0, middle) })
    ).length
    if (bytes <= remaining) {
      low = middle
    } else {
      high = middle - 1
    }
  }
  return section.text.slice(0, low).replace(/[\uD800-\uDBFF]$/, "")
}

function adjustEnd(section: Section) {
  if (section.start !== undefined) {
    section.end = section.start + section.text.length
  }
}
