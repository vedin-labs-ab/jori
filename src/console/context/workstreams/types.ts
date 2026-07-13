import { type useQuery } from "convex/react"
import { type api } from "../../../../convex/_generated/api"

export type Workstreams = NonNullable<
  ReturnType<typeof useQuery<typeof api.workstreams.queries.list>>
>["workstreams"]
export type Workstream = Workstreams[number]
