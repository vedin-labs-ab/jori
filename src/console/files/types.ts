import { type usePaginatedQuery, type useQuery } from "convex/react"
import { type api } from "../../../convex/_generated/api"

export type FileRow = NonNullable<
  ReturnType<typeof usePaginatedQuery<typeof api.files.console.page>>["results"]
>[number]

export type FileDetail = NonNullable<
  NonNullable<ReturnType<typeof useQuery<typeof api.files.console.get>>>["file"]
>

export const filePageSize = 12

export { formatFileSize } from "@/shared/materials/size"
