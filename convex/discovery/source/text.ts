import { type Section } from "./types"
/** Preserve every character and its source offsets across overlapping chunks. */
export function chunks(sections: Section[]): Section[] {
  const result: Section[] = []
  for (const section of sections) {
    const text = section.text
    for (let start = 0; start < text.length; ) {
      const end = boundary(text, start)
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
      start = safeOffset(text, end - 200)
    }
  }
  return result
}
/** Content-defined whitespace anchors resynchronize after insertions instead
 * of shifting every later chunk. The 32-character rolling window is independent
 * of its absolute offset; 2–4k limits and 200-character overlap bound context. */
function boundary(text: string, start: number) {
  const minimum = start + 2000
  const maximum = Math.min(start + 4000, text.length)
  if (maximum === text.length) {
    return maximum
  }
  let hash = 0,
    power = 1,
    fallback = maximum
  for (let i = 0; i < 32; i++) {
    power = Math.imul(power, 31)
  }
  for (let i = minimum - 32; i < maximum; i++) {
    hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0
    if (i >= minimum) {
      hash = (hash - Math.imul(text.charCodeAt(i - 32), power)) | 0
    }
    if (i + 1 >= minimum && /\s/.test(text[i])) {
      fallback = i + 1
      if ((hash & 127) === 0) {
        return fallback
      }
    }
  }
  return safeOffset(text, fallback)
}
function safeOffset(text: string, offset: number) {
  const current = text.charCodeAt(offset),
    previous = text.charCodeAt(offset - 1)
  return current >= 0xdc00 &&
    current <= 0xdfff &&
    previous >= 0xd800 &&
    previous <= 0xdbff
    ? offset - 1
    : offset
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
