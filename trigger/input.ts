export function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${name}`)
  }

  return value
}

export function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

export function optionalStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== ""
  )
}
