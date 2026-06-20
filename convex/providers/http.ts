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
