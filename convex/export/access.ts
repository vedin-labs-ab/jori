import { type QueryCtx } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { requireUserId } from "../access/users"
import { authComponent, createAdapterOptions } from "../auth"
import { resolveConsolePerson } from "../persons/account"
import { createSight } from "../visibility/sight"

export async function exportSight(ctx: QueryCtx, organizationId: string) {
  const identity = await requireOrganizationAccess(ctx, organizationId)
  const adapter = authComponent.adapter(ctx)(createAdapterOptions())
  const member = await adapter.findOne<{ role: string }>({
    model: "member",
    where: [
      { field: "organizationId", value: organizationId },
      { field: "userId", value: requireUserId(identity) },
    ],
  })
  if (!member?.role.split(",").includes("owner")) {
    throw new Error("Only a current workspace owner can export workspace data.")
  }
  const personId = await resolveConsolePerson(ctx, organizationId, identity)
  return createSight(ctx, { organizationId, personId })
}
