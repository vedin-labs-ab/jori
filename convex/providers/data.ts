type ProviderDataPath = [string, ...string[]]

export function readProviderDataString(
  data: unknown,
  ...path: ProviderDataPath
) {
  const value = readProviderDataValue(data, path)

  return typeof value === "string" ? value : undefined
}

function readProviderDataValue(data: unknown, path: ProviderDataPath) {
  let value = data

  for (const key of path) {
    if (typeof value !== "object" || value === null) {
      return undefined
    }

    value = (value as Record<string, unknown>)[key]
  }

  return value
}
