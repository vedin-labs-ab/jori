import { Zip, ZipPassThrough } from "fflate"
import { downloadBlob, downloadUrl } from "./download"

const maximumBytes = 100 * 1024 * 1024
const tooLarge = "These files exceed 100 MB. Select fewer files and try again."

/** Multiple anchors can be blocked by the browser. Save one archive only
 * after every selected file has arrived, keeping memory bounded. */
export async function downloadFiles(
  files: { name: string; url: string | null; size: number }[]
) {
  if (files.length === 0) {
    return
  }
  if (files.some((file) => file.url === null)) {
    throw new Error("A file is unavailable. Refresh the page and try again.")
  }
  const first = files[0]
  if (files.length === 1 && first?.url) {
    await downloadUrl(first.name, first.url)
    return
  }
  if (files.reduce((total, file) => total + file.size, 0) > maximumBytes) {
    throw new Error(tooLarge)
  }

  const parts: BlobPart[] = []
  const names = new Set<string>()
  let bytes = 0
  const zip = new Zip((error, data) => {
    if (error) {
      throw error
    }
    parts.push(new Uint8Array(data))
  })
  try {
    for (const file of files) {
      const entry = new ZipPassThrough(archiveName(file.name, names))
      zip.add(entry)
      bytes += await appendFile(entry, file, maximumBytes - bytes)
    }
    zip.end()
    downloadBlob("jori-files.zip", new Blob(parts, { type: "application/zip" }))
  } finally {
    zip.terminate()
  }
}

async function appendFile(
  entry: ZipPassThrough,
  file: { url: string | null; size: number },
  budget: number
) {
  const response = await fetch(file.url as string, { credentials: "omit" })
  if (!response.ok || !response.body) {
    throw new Error("A file could not be downloaded. Please try again.")
  }
  const reader = response.body.getReader()
  let bytes = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      bytes += value.byteLength
      if (bytes > budget) {
        throw new Error(tooLarge)
      }
      entry.push(value)
    }
    if (bytes !== file.size) {
      throw new Error(
        "A file changed while downloading. Refresh the page and try again."
      )
    }
    entry.push(new Uint8Array(), true)
    return bytes
  } finally {
    await reader.cancel()
  }
}

function archiveName(name: string, used: Set<string>) {
  let safe = name
    .replaceAll(/[\\/:*?"<>|]/g, "-")
    .replaceAll(/\p{Cc}/gu, "")
    .trim()
    .replace(/[. ]+$/, "")
  if (!safe) {
    safe = "file"
  }
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)) {
    safe = `_${safe}`
  }
  const dot = safe.lastIndexOf(".")
  const stem = dot > 0 ? safe.slice(0, dot) : safe
  const extension = dot > 0 ? safe.slice(dot) : ""
  let candidate = safe
  for (let suffix = 2; used.has(candidate.toLowerCase()); suffix += 1) {
    candidate = `${stem} (${suffix})${extension}`
  }
  used.add(candidate.toLowerCase())
  return candidate
}
