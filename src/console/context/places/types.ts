import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../../convex/_generated/api"

export type Places = NonNullable<
  FunctionReturnType<typeof api.places.console.list>
>["places"]
export type Place = Places[number]
