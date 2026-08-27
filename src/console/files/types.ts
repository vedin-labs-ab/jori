import { type usePaginatedQuery } from "convex/react"
import { type api } from "../../../convex/_generated/api"

export type FileRow = NonNullable<
  ReturnType<typeof usePaginatedQuery<typeof api.files.console.page>>["results"]
>[number]

export const filePageSize = 12

export { formatFileSize } from "@/shared/materials/size"
