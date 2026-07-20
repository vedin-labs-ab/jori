import { type QueryCtx } from "../../_generated/server"
import { type requireOrganizationAccess } from "../../access"
import { requireClerkUserId } from "../../access/users"
import { resolvePersonByIdentity } from "../../persons/identity/links"

/** The caller's person for ownership filtering; authenticate in the handler
 * before resolving it here. */
export async function resolveConsolePerson(
  ctx: QueryCtx,
  organizationId: string,
  identity: Awaited<ReturnType<typeof requireOrganizationAccess>>
) {
  return await resolvePersonByIdentity(ctx, {
    organizationId,
    provider: "clerk",
    externalId: requireClerkUserId(identity),
  })
}
