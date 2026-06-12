import { type MutationCtx } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"

export async function buildInstallState(
  ctx: MutationCtx,
  args: {
    tenantId: string
    returnUrl: string
  }
) {
  const identity = await requireTenantAccess(ctx, args.tenantId)

  return {
    tenantId: args.tenantId,
    createdBy: requireClerkUserId(identity),
    returnUrl: args.returnUrl,
    createdAt: Date.now(),
  }
}
