export type ProviderCallbackStatus = "connected" | "error"

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
