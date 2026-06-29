import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type IdentityProvider } from "../identity/schema"
import { linkIdentityToPerson } from "./links"

export const setupIdentityValidator = v.object({
  externalId: v.string(),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
})

export type SetupIdentity = {
  externalId: string
  email?: string
  name?: string
}

export async function linkSetupIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    personId: Id<"persons">
    provider: IdentityProvider
    identity: SetupIdentity | undefined
  }
) {
  if (args.identity === undefined) {
    return undefined
  }

  return await linkIdentityToPerson(ctx, {
    tenantId: args.tenantId,
    personId: args.personId,
    provider: args.provider,
    externalId: args.identity.externalId,
    method: "oauth",
    email: args.identity.email,
    name: args.identity.name,
  })
}
