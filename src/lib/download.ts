/** Name an export after the material it serializes, replacing characters
 *  that are unsafe in filenames. */
export function toFilename(name: string, extension: string) {
  return `${name.replaceAll(/[\\/:]/g, "-")}.${extension}`
}

/** Download text as a file through a temporary object URL. */
export function downloadTextFile(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))

  downloadUrl(filename, url)
  URL.revokeObjectURL(url)
}

/** Download an already-hosted file through a temporary anchor. */
export function downloadUrl(filename: string, url: string) {
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = filename
  anchor.rel = "noreferrer"
  anchor.click()
}
