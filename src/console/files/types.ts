import { type usePaginatedQuery } from "convex/react"
import { type api } from "../../../convex/_generated/api"

export type FileRow = NonNullable<
  ReturnType<typeof usePaginatedQuery<typeof api.files.console.page>>["results"]
>[number]

export const filePageSize = 12

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
