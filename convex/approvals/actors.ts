import { type MutationCtx } from "../_generated/server"
import { canonicalPersonId } from "../persons/data"
import { type IdentityProvider } from "../persons/identity/schema"
import { findMember } from "../persons/member"
import { resolveActor } from "../persons/resolve"
import { type Actor } from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"
import { type ToolSurface } from "../shared/integrations"

export async function resolveApprovalActor(
  ctx: MutationCtx,
  args: {
    actor: Actor
    surface: ToolSurface
    organizationId: string
  }
) {
  const provider = approvalIdentityProvider(args.surface)

  if (provider === undefined) {
    return "personId" in args.actor
      ? await canonicalPersonId(ctx, args.actor.personId)
      : undefined
  }

  return await resolveActor(ctx, {
    actor: args.actor,
    provider,
    organizationId: args.organizationId,
  })
}

/** Who may decide an approval: a member on a provider surface, the
 *  signed-in person in the console. Undefined for everyone else. */
export async function findApprovalDecider(
  ctx: QueryLikeCtx,
  args: {
    actor: Actor
    surface: ToolSurface
    organizationId: string
  }
) {
  // The console authenticates its own actor, whichever surface asked.
  if ("personId" in args.actor) {
    return await canonicalPersonId(ctx, args.actor.personId)
  }

  const provider = approvalIdentityProvider(args.surface)

  if (provider === undefined) {
    return undefined
  }

  return await findMember(ctx, {
    actor: args.actor,
    provider,
    organizationId: args.organizationId,
  })
}

function approvalIdentityProvider(
  surface: ToolSurface
): IdentityProvider | undefined {
  if (surface === "github" || surface === "linear" || surface === "slack") {
    return surface
  }

  return undefined
}
