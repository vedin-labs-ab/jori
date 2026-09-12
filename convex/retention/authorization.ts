import { type UserIdentity } from "convex/server"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { readOrganizationClaim, requireUserId } from "../access/users"
import { authComponent, createAdapterOptions } from "../auth"

/** Status remains readable while content access is revoked for deletion. */
export async function requireRetentionAccess(
  ctx: MutationCtx | QueryCtx,
  organizationId: string,
  identity: UserIdentity
) {
  if (readOrganizationClaim(identity) !== organizationId) {
    throw new Error("Switch to this workspace to continue.")
  }
  const adapter = authComponent.adapter(ctx)(createAdapterOptions())
  const member = await adapter.findOne<{ role: string }>({
    model: "member",
    where: [
      { field: "organizationId", value: organizationId },
      { field: "userId", value: requireUserId(identity) },
    ],
  })
  if (!member) {
    throw new Error("Only a workspace owner can delete this workspace.")
  }
  return member
}

export async function requireOwner(
  ctx: MutationCtx | QueryCtx,
  organizationId: string,
  identity: UserIdentity
) {
  const member = await requireRetentionAccess(ctx, organizationId, identity)
  if (!member.role.split(",").includes("owner")) {
    throw new Error("Only a workspace owner can delete this workspace.")
  }
}
