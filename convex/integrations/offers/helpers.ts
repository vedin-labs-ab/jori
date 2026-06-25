import { type MutationCtx } from "../../_generated/server"
import { upsertIdentity } from "../../identity/identities"
import { readAppOrigin } from "../../shared/app"
import { type IntegrationOfferSource } from "./schema"
import { surfaceIdentityProvider } from "./source"
import { hashIntegrationOfferToken } from "./tokens"

export function integrationOfferLocation(token: string) {
  const urlPath = `/integrations/offers/${encodeURIComponent(token)}`
  const origin = requireAppOrigin()

  return {
    url: new URL(urlPath, origin).toString(),
    urlPath,
  }
}

export async function findIntegrationOfferByToken(
  ctx: MutationCtx,
  token: string
) {
  const tokenHash = await hashIntegrationOfferToken(token)

  return await ctx.db
    .query("integrationOffers")
    .withIndex("by_token_hash", (query) => query.eq("tokenHash", tokenHash))
    .first()
}

export async function upsertIntegrationOfferSourceIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    userId: string
    source: IntegrationOfferSource
  }
) {
  const provider = surfaceIdentityProvider(args.source.surface)
  const actor = args.source.actor

  if (provider === undefined || actor === undefined) {
    return
  }

  await upsertIdentity(ctx, {
    tenantId: args.tenantId,
    userId: args.userId,
    provider,
    externalId: actor.externalId,
    email: actor.email,
    name: actor.name,
  })
}

export function normalizeIntegrationOfferReturnUrl(returnUrl: string) {
  let url: URL

  try {
    url = new URL(returnUrl)
  } catch {
    throw new Error("Integration offer return URL must be absolute.")
  }

  if (
    url.origin !== requireAppOrigin() ||
    !url.pathname.startsWith("/integrations/offers/")
  ) {
    throw new Error(
      "Integration offer return URL must point to a Milo integration offer."
    )
  }

  url.search = ""
  url.hash = ""

  return url.toString()
}

function requireAppOrigin() {
  const origin = readAppOrigin()

  if (origin === undefined) {
    throw new Error(
      "MILO_APP_URL must be configured to create integration offers."
    )
  }

  return origin
}
