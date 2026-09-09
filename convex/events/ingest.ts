import { type ObjectType, v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { findIntegrationByExternalId } from "../integrations/data"
import { integrationValidator } from "../shared/integrations"
import { recordEvent } from "./data"
import { eventFields } from "./schema"

// Records an event for the active integration matching a provider account id,
// for webhook handlers that only know the external account. One shared path so
// providers never duplicate integration lookup around recordEvent.
export const recordFromProvider = internalMutation({
  args: {
    integration: integrationValidator,
    externalId: v.string(),
    expectedConnectionGeneration: v.optional(v.number()),
    ...eventFields,
  },
  handler: async (ctx, args) => {
    const integration = await findIntegrationByExternalId(ctx, args)

    if (
      args.expectedConnectionGeneration !== undefined &&
      (integration?.connectionGeneration ?? 0) !==
        args.expectedConnectionGeneration
    ) {
      return { status: "missing_integration" as const }
    }

    return await ingest(ctx, integration, args)
  },
})

async function ingest(
  ctx: MutationCtx,
  integration: Doc<"integrations"> | null,
  args: ObjectType<typeof eventFields>
) {
  if (integration === null || integration.status !== "active") {
    return { status: "missing_integration" as const }
  }

  const result = await recordEvent(ctx, {
    integration,
    key: args.key,
    type: args.type,
    match: args.match,
    actor: args.actor,
    text: args.text,
    data: args.data,
    observedAt: args.observedAt,
  })

  return {
    status: result.status,
    eventId: result.eventId,
    runIds: result.status === "recorded" ? result.runIds : [],
  }
}
