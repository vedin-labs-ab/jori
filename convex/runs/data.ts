export function readDataObject(data: unknown, key: string) {
  const value = readDataValue(data, key)

  return typeof value === "object" && value !== null ? value : undefined
}

export function readDataNumber(data: unknown, key: string) {
  const value = readDataValue(data, key)

  return typeof value === "number" ? value : undefined
}

export function readDataString(data: unknown, key: string) {
  const value = readDataValue(data, key)

  return typeof value === "string" ? value : undefined
}

function readDataValue(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  return (data as Record<string, unknown>)[key]
}
