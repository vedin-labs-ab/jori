import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../../convex/_generated/api"

export type Workstreams = NonNullable<
  FunctionReturnType<typeof api.workstreams.queries.list>
>["workstreams"]
export type Workstream = Workstreams[number]
