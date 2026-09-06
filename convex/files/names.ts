/** Keeps stored names to a safe single path segment; shared by the broker
 *  upload endpoint, the runtime's save tool, and the console. Kept apart
 *  from the data module so the runtime can name a file without loading
 *  the visibility resolver and the auth client behind it. */
export function normalizeFileName(value: string | null | undefined) {
  const name = value
    ?.trim()
    .split(/[\\/]/)
    .at(-1)
    ?.replace(/[\r\n]/g, " ")
    .slice(0, 160)

  return name === undefined || name === "" ? "file" : name
}
