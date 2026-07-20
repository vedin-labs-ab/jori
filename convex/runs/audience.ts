import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { automationScope } from "../automations/access"
import { conversationAudience } from "../conversations/scope"
import { type AudienceScope } from "../shared/audience"
import { runAudienceScope } from "./scope"

export type RunAudience = {
  scope: AudienceScope
  conversationId?: Id<"conversations">
}

type RunAudienceInput = {
  createdBy?: Id<"persons">
  parentId?: Id<"runs">
}

type RunOrigin = {
  automation?: Doc<"automations">
  conversation?: Doc<"conversations">
}

export async function resolveRunAudience(
  ctx: MutationCtx,
  args: {
    origin?: RunOrigin
    run: RunAudienceInput
  }
): Promise<RunAudience> {
  const parentAudience = await resolveParentAudience(ctx, args.run.parentId)

  if (parentAudience !== null) {
    return parentAudience
  }

  if (args.origin?.conversation !== undefined) {
    return conversationAudience(args.origin.conversation)
  }

  if (args.origin?.automation !== undefined) {
    return automationAudience(args.origin.automation)
  }

  return { scope: "person" }
}

async function resolveParentAudience(
  ctx: MutationCtx,
  parentId: Id<"runs"> | undefined
): Promise<RunAudience | null> {
  if (parentId === undefined) {
    return null
  }

  const parent = await ctx.db.get(parentId)

  if (parent === null) {
    throw new Error("Parent run not found.")
  }

  return {
    scope: runAudienceScope(parent),
    conversationId: parent.conversationId,
  }
}

function automationAudience(automation: Doc<"automations">): RunAudience {
  return automationScope(automation) === "organization"
    ? { scope: "organization" }
    : { scope: "person" }
}
