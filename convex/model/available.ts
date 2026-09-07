import { v } from "convex/values"
import { isModelSlug } from "../../contracts/models/catalog"
import { action } from "../_generated/server"
import { requireIdentity } from "../access"
import { eligibleModels } from "./eligibility"

/** Public model choices, without provider credentials or customer records. */
export const list = action({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    await requireIdentity(ctx)
    return (await eligibleModels()).map((model) => model.id).filter(isModelSlug)
  },
})
