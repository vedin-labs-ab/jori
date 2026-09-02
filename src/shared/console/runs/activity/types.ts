import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../../../convex/_generated/api"

export type ActivityResult = FunctionReturnType<
  typeof api.runs.activity.index.list
>
export type ActivityItem = ActivityResult["items"][number]
export type ActivityStatus = ActivityItem["status"]
export type ActivityKind = ActivityItem["kind"]
