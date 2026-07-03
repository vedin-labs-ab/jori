import { type useQuery } from "convex/react"
import { type api } from "../../../../convex/_generated/api"

export type Workstreams = NonNullable<
  ReturnType<typeof useQuery<typeof api.deduction.console.queries.list>>
>["workstreams"]
export type Workstream = Workstreams[number]

export const statusVariants: Record<
  Workstream["status"],
  "secondary" | "outline"
> = {
  proposed: "secondary",
  confirmed: "outline",
  closed: "outline",
  rejected: "outline",
}
