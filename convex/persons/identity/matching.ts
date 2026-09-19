import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type QueryLikeCtx } from "../../shared/context"
import { identifyingEmail } from "../email"
import { mergeWinner } from "../merge"

// A single human plausibly spans a few surface identities; many more sharing one
// email means a shared/role address, so we stop converging on it.
const emailIdentityLimit = 5

// Converge every person that shares an identifying email into one survivor, chosen
// by link-method precedence. Returns the survivor, or undefined when the email is
// non-identifying or spans too many identities to be trusted.
export async function convergeEmail(
  ctx: MutationCtx,
  organizationId: string,
  email: string | undefined
): Promise<Id<"persons"> | undefined> {
  return await mergeWinner(
    ctx,
    organizationId,
    (await emailIdentities(ctx, organizationId, email)).map((identity) => ({
      personId: identity.personId,
      method: identity.link.method,
    }))
  )
}

/** The identities sharing an identifying email; none when the email is
 *  non-identifying or spans too many identities to be trusted. */
export async function emailIdentities(
  ctx: QueryLikeCtx,
  organizationId: string,
  email: string | undefined
) {
  const normalized = identifyingEmail(email)

  if (normalized === undefined) {
    return []
  }

  const identities = await ctx.db
    .query("identities")
    .withIndex("by_organization_email", (index) =>
      index.eq("organizationId", organizationId).eq("email", normalized)
    )
    .take(emailIdentityLimit + 1)

  return identities.length > emailIdentityLimit ? [] : identities
}
