import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"

export async function recordSetupLinkEvent(
  ctx: MutationCtx,
  args: {
    data?: Doc<"setupLinkEvents">["data"]
    link: Doc<"setupLinks">
    syncSurface?: boolean
    type: Doc<"setupLinkEvents">["type"]
  }
) {
  await ctx.db.insert("setupLinkEvents", {
    tenantId: args.link.tenantId,
    setupLinkId: args.link._id,
    integration: args.link.integration,
    sourceSurface: args.link.source.surface,
    status: args.link.status,
    type: args.type,
    data: args.data,
    createdAt: Date.now(),
  })

  if (args.syncSurface === true) {
    await ctx.scheduler.runAfter(
      0,
      internal.integrations.setup.lifecycle.sync,
      {
        setupLinkId: args.link._id,
      }
    )
  }
}
