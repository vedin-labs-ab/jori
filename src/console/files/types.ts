import { type useQuery } from "convex/react"
import { type api } from "../../../convex/_generated/api"

export type FileRow = NonNullable<
  ReturnType<typeof useQuery<typeof api.files.console.list>>
>[number]

export type FileDetail = NonNullable<
  NonNullable<ReturnType<typeof useQuery<typeof api.files.console.get>>>["file"]
>
