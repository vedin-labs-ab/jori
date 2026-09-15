import { Unzip, UnzipInflate } from "fflate"
import { CoverageError } from "./types"

const archiveByteLimit = 12 * 1024 * 1024
const contentFile =
  /^(word\/(document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml|xl\/(sharedStrings|worksheets\/sheet\d+)\.xml|ppt\/(slides\/slide\d+|notesSlides\/notesSlide\d+)\.xml|content\.xml)$/

/** Count actual expanded bytes, not the untrusted size in a ZIP header.
 * Small compressed chunks also bound transient decompression allocations. */
export function readArchive(bytes: Uint8Array) {
  const files: Record<string, Uint8Array> = {}
  let expanded = 0
  let entries = 0
  const unzip = new Unzip((file) => {
    entries++
    if (entries > 2000) {
      throw new CoverageError(
        "too_large",
        "The document exceeds 2,000 archive entries."
      )
    }
    if (!contentFile.test(file.name)) {
      return
    }
    const chunks: Uint8Array[] = []
    let size = 0
    file.ondata = (error, chunk, final) => {
      if (error) {
        throw error
      }
      expanded += chunk.length
      size += chunk.length
      if (expanded > archiveByteLimit) {
        throw new CoverageError(
          "too_large",
          "The expanded document exceeds the extraction limit."
        )
      }
      chunks.push(chunk)
      if (final) {
        files[file.name] = combine(chunks, size)
      }
    }
    file.start()
  })
  unzip.register(UnzipInflate)
  for (let start = 0; start < bytes.length; start += 1024) {
    unzip.push(
      bytes.subarray(start, start + 1024),
      start + 1024 >= bytes.length
    )
  }
  return files
}

function combine(chunks: Uint8Array[], size: number) {
  const content = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    content.set(chunk, offset)
    offset += chunk.length
  }
  return content
}
