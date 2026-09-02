import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../../convex/_generated/api"

export type StoreListResult = NonNullable<
  FunctionReturnType<typeof api.stores.console.list>
>

export type StoreSummary = Extract<
  StoreListResult,
  { status: "ready" }
>["stores"][number]

type StoreDetailResult = NonNullable<
  FunctionReturnType<typeof api.stores.console.get>
>

export type StoreDetail = NonNullable<
  Extract<StoreDetailResult, { status: "ready" }>["store"]
>
