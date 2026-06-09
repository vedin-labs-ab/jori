export function readProviderDataObject(data: unknown, key: string) {
  const value = readProviderDataValue(data, key)

  return typeof value === "object" && value !== null ? value : undefined
}

export function readProviderDataArray(data: unknown, key: string) {
  const value = readProviderDataValue(data, key)

  return Array.isArray(value) ? value : []
}

export function readProviderDataString(data: unknown, key: string) {
  const value = readProviderDataValue(data, key)

  return typeof value === "string" ? value : undefined
}

function readProviderDataValue(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  return (data as Record<string, unknown>)[key]
}
