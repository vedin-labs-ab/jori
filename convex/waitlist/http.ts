import { isRecord } from "../../contracts/json"
import { internal } from "../_generated/api"
import { type ActionCtx } from "../_generated/server"
import { readOrigin, readPublicOrigin } from "../shared/origin"

/**
 * The waitlist is a public form post, so it lives on an HTTP route rather
 * than a public Convex function. That is not a way around the entrypoint
 * guard: it is the only surface where the caller's address is readable, and
 * without an address there is no per-caller limit, only a global one that any
 * single abuser could use to lock everyone else out.
 */
export async function handleWaitlistRequest(ctx: ActionCtx, request: Request) {
  const headers = corsHeaders(request)
  const payload: unknown = await request.json().catch(() => undefined)

  if (!isWaitlistRequest(payload)) {
    return Response.json({ status: "invalid" }, { status: 400, headers })
  }

  // The honeypot is a field no person can see or tab into. Anything that
  // fills it is automated, and gets the same answer a person would so it
  // learns nothing. Nothing is stored and no mail is sent.
  if (payload.company !== "") {
    return Response.json({ status: "joined" }, { headers })
  }

  const result = await ctx.runMutation(internal.waitlist.signup.join, {
    address: readAddress(request),
    email: payload.email,
    size: payload.size,
    work: payload.work,
  })

  return Response.json(result, { status: statusCode(result.status), headers })
}

export function handleWaitlistPreflight(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(request),
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST",
      "access-control-max-age": "86400",
    },
  })
}

/**
 * The caller's address, as the edge in front of the deployment reports it.
 *
 * Convex serves through Cloudflare today, so cf-connecting-ip is the exact
 * client address and a forged copy from the caller is discarded before the
 * request arrives. x-forwarded-for is the fallback if that edge ever changes;
 * it is overwritten the same way, and its left-most entry is the client.
 *
 * Verified against the deployment: a request carrying its own
 * x-forwarded-for arrives with the header replaced, not appended, so neither
 * value can be chosen by the caller.
 *
 * An address that cannot be read shares one bucket with every other unknown
 * caller, so a missing header degrades the limit rather than removing it.
 */
function readAddress(request: Request) {
  const address =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]

  return address?.trim() || undefined
}

/** Posted from the Jori app origin, which is a different host from the
 *  deployment's own, so this route needs CORS. */
function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin")

  return origin !== null && [readOrigin(), readPublicOrigin()].includes(origin)
    ? { "access-control-allow-origin": origin, vary: "origin" }
    : {}
}

function statusCode(status: "joined" | "rejected" | "throttled") {
  if (status === "throttled") {
    return 429
  }

  return status === "rejected" ? 422 : 200
}

function isWaitlistRequest(
  value: unknown
): value is { company: string; email: string; size: string; work: string } {
  return (
    isRecord(value) &&
    typeof value.company === "string" &&
    typeof value.email === "string" &&
    typeof value.size === "string" &&
    typeof value.work === "string"
  )
}
