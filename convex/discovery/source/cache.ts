import { strFromU8, strToU8, unzlibSync, zlibSync } from "fflate"

/** Compress only when smaller; short passages remain plain strings. Keeping
 * this cache in Convex preserves transactional authorization and excerpts. */
export function pack(text: string): string | ArrayBuffer {
  const bytes = strToU8(text)
  if (strFromU8(bytes) !== text) {
    return text
  }
  const compressed = zlibSync(bytes)
  return compressed.byteLength < bytes.byteLength
    ? new Uint8Array(compressed).buffer
    : text
}

export function unpack(text: string | ArrayBuffer): string {
  return typeof text === "string"
    ? text
    : strFromU8(unzlibSync(new Uint8Array(text)))
}
