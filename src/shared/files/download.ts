/** Name an export after the material it serializes, replacing characters
 *  that are unsafe in filenames. */
export function toFilename(name: string, extension: string) {
  return `${name.replaceAll(/[\\/:]/g, "-")}.${extension}`
}

/** Download text as a file through a temporary object URL. */
export function downloadTextFile(filename: string, text: string, type: string) {
  downloadBlob(filename, new Blob([text], { type }))
}

/** Cross-origin anchors ignore `download`. Fetch the bytes first so the
 * browser saves the named file instead of navigating away from the console. */
export async function downloadUrl(filename: string, url: string) {
  const response = await fetch(url, { credentials: "omit" })
  if (!response.ok) {
    throw new Error(
      "Could not download the file. Refresh the page and try again."
    )
  }
  downloadBlob(filename, await response.blob())
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noreferrer"
  document.body.append(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}
