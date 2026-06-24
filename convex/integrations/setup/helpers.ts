import { type MutationCtx } from "../../_generated/server"
import { upsertIdentity } from "../../identity/identities"
import { readAppOrigin } from "../../shared/app"
import { type SetupLinkSource } from "./schema"
import { surfaceIdentityProvider } from "./source"
import { hashSetupToken } from "./tokens"

export function setupLinkLocation(token: string) {
  const urlPath = `/integrations/setup/${encodeURIComponent(token)}`
  const origin = requireAppOrigin()

  return {
    url: new URL(urlPath, origin).toString(),
    urlPath,
  }
}

export async function findSetupLinkByToken(ctx: MutationCtx, token: string) {
  const tokenHash = await hashSetupToken(token)

  return await ctx.db
    .query("setupLinks")
    .withIndex("by_token_hash", (query) => query.eq("tokenHash", tokenHash))
    .first()
}

export async function upsertSetupSourceIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    userId: string
    source: SetupLinkSource
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

export function normalizeSetupReturnUrl(returnUrl: string) {
  let url: URL

  try {
    url = new URL(returnUrl)
  } catch {
    throw new Error("Setup return URL must be absolute.")
  }

  if (
    url.origin !== requireAppOrigin() ||
    !url.pathname.startsWith("/integrations/setup/")
  ) {
    throw new Error("Setup return URL must point to a Milo setup link.")
  }

  url.search = ""
  url.hash = ""

  return url.toString()
}

function requireAppOrigin() {
  const origin = readAppOrigin()

  if (origin === undefined) {
    throw new Error("MILO_APP_URL must be configured to create setup links.")
  }

  return origin
}
