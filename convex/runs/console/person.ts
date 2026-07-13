import { type QueryCtx } from "../../_generated/server"
import { type requireTenantAccess } from "../../identity/access"
import { requireClerkUserId } from "../../identity/users"
import { resolvePersonByIdentity } from "../../persons/links"

/** The caller's person for ownership filtering; authenticate in the handler
 * before resolving it here. */
export async function resolveConsolePerson(
  ctx: QueryCtx,
  tenantId: string,
  identity: Awaited<ReturnType<typeof requireTenantAccess>>
) {
  return await resolvePersonByIdentity(ctx, {
    tenantId,
    provider: "clerk",
    externalId: requireClerkUserId(identity),
  })
}
