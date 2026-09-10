import { v } from "convex/values"
import { internalQuery } from "../_generated/server"
import { resourceViewerArgs } from "../visibility/resources"
import { searchStores, summarizeStore } from "./access"

export const search = internalQuery({
  args: {
    ...resourceViewerArgs,
    query: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const stores = await searchStores(ctx, args)

    return stores.map((store) => summarizeStore(store))
  },
})
