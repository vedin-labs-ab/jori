import { type MutationCtx } from "../_generated/server"
import { type IdentityProvider } from "../persons/identity/schema"
import { resolveActor } from "../persons/resolve"
import { type Actor } from "../shared/actor"
import { type ToolSurface } from "../shared/integrations"

export async function resolveApprovalActor(
  ctx: MutationCtx,
  args: {
    actor: Actor
    surface: ToolSurface
    tenantId: string
  }
) {
  const provider = approvalIdentityProvider(args.surface)

  if (provider === undefined) {
    return
  }

  await resolveActor(ctx, {
    actor: args.actor,
    provider,
    tenantId: args.tenantId,
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
