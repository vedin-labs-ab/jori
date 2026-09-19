/** Whether an organization finished onboarding. Better Auth stores
 *  organization metadata as JSON; depending on the read path it surfaces
 *  parsed or as the raw string. */
export function readOnboarded(metadata: unknown): boolean {
  const record = typeof metadata === "string" ? parseJson(metadata) : metadata

  if (typeof record !== "object" || record === null) {
    return false
  }

  return (record as { onboarded?: unknown }).onboarded === true
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
