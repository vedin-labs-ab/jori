/** Name an export after the material it serializes, replacing characters
 *  that are unsafe in filenames. */
export function toFilename(name: string, extension: string) {
  return `${name.replaceAll(/[\\/:]/g, "-")}.${extension}`
}

/** Download text as a file through a temporary object URL. */
export function downloadTextFile(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
