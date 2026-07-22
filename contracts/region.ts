export const regions = ["us", "eu"] as const

export type Region = (typeof regions)[number]

export function isRegion(value: unknown): value is Region {
  return regions.some((region) => region === value)
}
