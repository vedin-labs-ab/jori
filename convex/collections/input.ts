// Input normalization shared by every collection kind: names, descriptions,
// and the optimistic version handshake.

export function normalizeCollectionName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : ""

  if (name === "") {
    throw new Error("A name is required.")
  }

  return name.slice(0, 120)
}

export function normalizeCollectionDescription(value: unknown) {
  if (typeof value !== "string") {
    return undefined
  }

  const description = value.trim()

  return description === "" ? undefined : description.slice(0, 500)
}

export function normalizeExpectedVersion(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined
  }

  return Math.max(0, Math.trunc(value))
}

/** The optimistic concurrency handshake: a caller that passes the version
 *  it read only wins when nothing changed since. */
export function assertExpectedVersion(
  expected: number | undefined,
  current: number,
  label: string
) {
  if (expected !== undefined && expected !== current) {
    throw new Error(
      `${label} version conflict: expected ${expected}, found ${current}. Re-read before writing.`
    )
  }
}
