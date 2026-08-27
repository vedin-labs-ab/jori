import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { requireRunBudget } from "../billing/guard"
import { type Access } from "../shared/integrations"
import { resolveRunAudience } from "./audience"
import { queueRun } from "./execution/outbox/data"
import {
  type ExecutionPrincipal,
  executionPrincipalForPerson,
} from "./principal"
import { createInstructionRunSnapshot } from "./snapshot"

/**
 * A manual run from bare instructions — no automation behind it. `access`
 * narrows the run to an explicit tool contract; omitted, the run gets the
 * caller's full tool surface.
 */
export async function createInstructionRun(
  ctx: MutationCtx,
  args: {
    organizationId: string
    instructions: string
    title?: string
    access?: Access
    parent?: Doc<"runs">
    createdBy?: Id<"persons">
    principal?: ExecutionPrincipal
    /** One-time playbook trial: the run does a representative slice only. */
    trial?: true
  }
) {
  const parent = args.parent

  // Child runs ride on their parent's budget; only fresh work is gated.
  if (parent === undefined) {
    await requireRunBudget(ctx, {
      organizationId: args.organizationId,
      interactive: true,
    })
  }

  const runId = await ctx.db.insert("runs", {
    organizationId: args.organizationId,
    ...(parent === undefined
      ? {}
      : {
          parentId: parent._id,
          rootId: parent.rootId ?? parent._id,
          ...inheritedAutomationExecution(parent),
        }),
    ...(args.trial === true ? { trial: true } : {}),
    cause: { type: "manual", personId: args.createdBy },
    principal:
      args.principal ??
      parent?.principal ??
      executionPrincipalForPerson(args.createdBy),
    access: args.access,
    ...createInstructionRunSnapshot({
      instructions: args.instructions,
      title: args.title,
    }),
    ...(await resolveRunAudience(ctx, {
      run: { createdBy: args.createdBy, parentId: parent?._id },
    })),
    status: "queued",
    createdBy: args.createdBy,
    createdAt: Date.now(),
  })

  await queueRun(ctx, runId)

  return runId
}

function inheritedAutomationExecution(parent: Doc<"runs">) {
  if (parent.automationId === undefined) {
    return {}
  }

  return {
    automationId: parent.automationId,
    ...(parent.automationParentId === undefined
      ? {}
      : { automationParentId: parent.automationParentId }),
    ...(parent.automationConfigurationVersion === undefined
      ? {}
      : {
          automationConfigurationVersion: parent.automationConfigurationVersion,
        }),
  }
}
