export type ProviderCallbackStatus = "connected" | "error"

const callbackStateMaxAgeMs = 10 * 60 * 1000

export function redirectWithStatus(
  returnUrl: string,
  param: string,
  status: ProviderCallbackStatus
) {
  const url = new URL(returnUrl)
  url.searchParams.set(param, status)

  return Response.redirect(url.toString(), 302)
}

export function unauthorizedResponse() {
  return new Response("Unauthorized", { status: 401 })
}

export function oauthAuthorizeRedirect(
  request: Request,
  args: {
    authorizeUrl: string
    callbackPath: string
    clientId: string
    params: Record<string, string>
  }
) {
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get("state")

  if (state === null) {
    return new Response("Missing state", { status: 400 })
  }

  const url = new URL(args.authorizeUrl)
  url.searchParams.set("client_id", args.clientId)

  for (const [key, value] of Object.entries(args.params)) {
    url.searchParams.set(key, value)
  }

  url.searchParams.set("state", state)
  url.searchParams.set(
    "redirect_uri",
    `${requestUrl.origin}${args.callbackPath}`
  )

  return Response.redirect(url.toString(), 302)
}

export async function readOAuthCallback<State extends { createdAt: number }>(
  request: Request,
  args: {
    parse: (value: string) => Promise<State>
    label: string
  }
): Promise<
  | { ok: true; code: string; requestUrl: URL; state: State }
  | { ok: false; response: Response }
> {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const stateValue = requestUrl.searchParams.get("state")

  if (code === null || stateValue === null) {
    return {
      ok: false,
      response: new Response("Missing OAuth callback parameters", {
        status: 400,
      }),
    }
  }

  const parsed = await readCallbackState({
    value: stateValue,
    parse: args.parse,
    label: args.label,
  })

  if (!parsed.ok) {
    return parsed
  }

  return { ok: true, code, requestUrl, state: parsed.state }
}

export async function readCallbackState<
  State extends { createdAt: number },
>(args: {
  value: string
  parse: (value: string) => Promise<State>
  label: string
}): Promise<{ ok: true; state: State } | { ok: false; response: Response }> {
  let state: State

  try {
    state = await args.parse(args.value)
  } catch {
    return {
      ok: false,
      response: new Response(`Invalid ${args.label} state`, { status: 400 }),
    }
  }

  if (Date.now() - state.createdAt > callbackStateMaxAgeMs) {
    return {
      ok: false,
      response: new Response(`Expired ${args.label} state`, { status: 400 }),
    }
  }

  return { ok: true, state }
}
