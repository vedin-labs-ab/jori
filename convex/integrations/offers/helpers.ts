import { type MutationCtx } from "../../_generated/server"
import { requireOrigin } from "../../shared/origin"
import { hashIntegrationOfferToken } from "./tokens"

export function integrationOfferLocation(token: string) {
  const urlPath = `/integrations/offers/${encodeURIComponent(token)}`
  const origin = requireOrigin()

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

  if (url.origin !== requireOrigin() || !isAllowedPath(url)) {
    throw new Error(
      "Integration offer return URL must point to a Jori integration offer."
    )
  }

  url.search = ""
  url.hash = ""

  return url.toString()
}
