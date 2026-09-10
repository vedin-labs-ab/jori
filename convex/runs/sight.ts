import { type Doc } from "../_generated/dataModel"
import { conversationGate } from "../conversations/access"
import { jobGate } from "../jobs/access"
import { type QueryLikeCtx } from "../shared/context"
import { createAudienceSight } from "../visibility/execution"
import { createSight, type Gate, type Sight } from "../visibility/sight"
import { executionPrincipalPersonId } from "./principal"

type ScopedRun = Pick<
  Doc<"runs">,
  | "organizationId"
  | "principal"
  | "conversationId"
  | "job"
  | "rootId"
  | "parentId"
>

/** The resource whose audience owns this work, including delegated work. */
export async function runResourceGate(
  ctx: QueryLikeCtx,
  run: ScopedRun
): Promise<Gate | undefined> {
  if (run.conversationId !== undefined) {
    const conversation = await ctx.db.get(run.conversationId)
    if (
      conversation?.organizationId === run.organizationId &&
      conversation.surface === "console"
    ) {
      return conversationGate(conversation)
    }
  }
  if (run.job !== undefined) {
    const job = await ctx.db.get(run.job.id)
    if (job?.organizationId === run.organizationId) {
      return jobGate(job)
    }
  }
  const rootId = run.rootId ?? run.parentId
  if (rootId !== undefined) {
    const root = await ctx.db.get(rootId)
    if (root?.organizationId === run.organizationId) {
      return await runResourceGate(ctx, {
        ...root,
        rootId: undefined,
        parentId: undefined,
      })
    }
  }
  return undefined
}

/** Credentials belong to the principal; shared resource access belongs to
 *  the audience, so shared work never borrows a sender's private rights. */
export async function createRunSight(
  ctx: QueryLikeCtx,
  run: ScopedRun
): Promise<Sight> {
  const gate = await runResourceGate(ctx, run)
  return gate !== undefined && gate.visibility.mode !== "private"
    ? createAudienceSight(ctx, gate)
    : createSight(ctx, {
        organizationId: run.organizationId,
        personId: executionPrincipalPersonId(run.principal),
      })
}
