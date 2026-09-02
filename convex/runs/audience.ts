import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { conversationAudience } from "../conversations/scope"
import { type Audience } from "../shared/audience"
import { executesAsOrganization } from "./principal"

export type RunAudience = {
  audience: Audience
  conversationId?: Id<"conversations">
}

type RunAudienceInput = {
  createdBy?: Id<"persons">
  parentId?: Id<"runs">
}

type RunOrigin = {
  job?: Doc<"jobs">
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

  if (args.origin?.job !== undefined) {
    return jobAudience(args.origin.job)
  }

  return { audience: "person" }
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
    audience: parent.audience,
    conversationId: parent.conversationId,
  }
}

/** A job that executes as the organization reaches everyone; one
 *  that executes as its person stays that person's. */
function jobAudience(job: Doc<"jobs">): RunAudience {
  return executesAsOrganization(job.visibility)
    ? { audience: "organization" }
    : { audience: "person" }
}
