import { storage } from "@contracts/billing"

export function gb(bytes: number) {
  if (bytes > 0 && bytes < storage.bytesPerGb / 1000) {
    return "<0.001"
  }
  return (bytes / storage.bytesPerGb).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })
}
