import { type Section } from "./types"
/** Preserve every character and its source offsets; prefer sentence boundaries. */
export function chunks(sections: Section[]): Section[] {
  const result: Section[] = []
  for (const section of sections) {
    const text = section.text
    for (let start = 0; start < text.length; ) {
      let end = Math.min(start + 3000, text.length)
      if (end < text.length) {
        const tail = text.slice(start + 2000, end)
        const matches = [...tail.matchAll(/\n\s*\n|[.!?]\s|\s/g)]
        const last = matches.at(-1)
        if (last) {
          end = start + 2000 + last.index + last[0].length
        }
      }
      result.push({
        text: text.slice(start, end),
        location: {
          ...section.location,
          start: (section.location.start ?? 0) + start,
          end: (section.location.start ?? 0) + end,
        },
      })
      if (end === text.length) {
        break
      }
      start = end - 200
    }
  }
  return result
}
export function readable(value: unknown): string {
  if (value === null) {
    return "null"
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(readable).join("\n")
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${readable(v)}`)
      .join("\n")
  }
  return ""
}
