import { type useQuery } from "convex/react"
import { type api } from "../../../../convex/_generated/api"

export type Places = NonNullable<
  ReturnType<typeof useQuery<typeof api.places.console.list>>
>["places"]
export type Place = Places[number]
