import { isIntegrationCallbackPath } from "../../../contracts/integrations/callback"
import { type ActionCtx } from "../../_generated/server"
import { requireOrigin } from "../../shared/origin"

export const callbackHeaders = {
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
}

export function privateRedirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: { ...callbackHeaders, location: url },
  })
}

/** OAuth returns to Convex without first-party Jori cookies. The regional
 * frontend authenticates the browser, then forwards with its Convex JWT. */
export async function regionalCallback(ctx: ActionCtx, request: Request) {
  if ((await ctx.auth.getUserIdentity()) !== null) {
    return null
  }
  const incoming = new URL(request.url)
  if (!isIntegrationCallbackPath(incoming.pathname)) {
    return new Response("Unknown integration callback", {
      status: 400,
      headers: callbackHeaders,
    })
  }
  const target = new URL("/api/integrations/callback", requireOrigin())
  target.searchParams.set("callback", incoming.pathname)
  for (const name of ["code", "state", "installation_id", "error"]) {
    const value = incoming.searchParams.get(name)
    if (value !== null) {
      target.searchParams.set(name, value)
    }
  }
  return privateRedirect(target.toString())
}
