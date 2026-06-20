import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"

export type ProviderToolContext = {
  ctx: ActionCtx
  run: Doc<"runs">
}
