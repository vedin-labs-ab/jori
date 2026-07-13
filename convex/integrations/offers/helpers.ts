import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { linkIdentityToPerson } from "../../persons/identity/links"
import { requireAppOrigin } from "../../shared/app"
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
    personId: Id<"persons">
    source: IntegrationOfferSource
  }
) {
  const provider = surfaceIdentityProvider(args.source.surface)
  const actor = args.source.actor

  if (provider === undefined || actor === undefined) {
    return
  }

  await linkIdentityToPerson(ctx, {
    tenantId: args.tenantId,
    personId: args.personId,
    provider,
    externalId: actor.externalId,
    method: "observed",
    email: actor.email,
    name: actor.name,
  })
}

export function normalizeIntegrationOfferReturnUrl(returnUrl: string) {
  return normalizeOfferReturnUrl(returnUrl, (url) =>
    url.pathname.startsWith("/integrations/offers/")
  )
}

export function normalizeConsoleIntegrationOfferReturnUrl(returnUrl: string) {
  return normalizeOfferReturnUrl(returnUrl, (url) => url.pathname === "/runs")
}

function normalizeOfferReturnUrl(
  returnUrl: string,
  isAllowedPath: (url: URL) => boolean
) {
  let url: URL

  try {
    url = new URL(returnUrl)
  } catch {
    throw new Error("Integration offer return URL must be absolute.")
  }

  if (url.origin !== requireAppOrigin() || !isAllowedPath(url)) {
    throw new Error(
      "Integration offer return URL must point to a Milo integration offer."
    )
  }

  url.search = ""
  url.hash = ""

  return url.toString()
}
