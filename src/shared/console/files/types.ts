import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../../convex/_generated/api"

export type FileRow = FunctionReturnType<typeof api.files.console.list>[number]

export type FileDetail = NonNullable<
  FunctionReturnType<typeof api.files.console.get>["file"]
>
