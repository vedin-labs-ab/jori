import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"

export type AppListResult = NonNullable<
  FunctionReturnType<typeof api.apps.console.list>
>

export type AppSummary = Extract<
  AppListResult,
  { status: "ready" }
>["apps"][number]

type AppDetailResult = NonNullable<
  FunctionReturnType<typeof api.apps.console.get>
>

export type AppDetail = NonNullable<
  Extract<AppDetailResult, { status: "ready" }>["app"]
>
