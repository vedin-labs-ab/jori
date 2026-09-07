import { isIntegrationCallbackPath } from "../../../contracts/integrations/callback"

const privateHeaders = {
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
}

/** Forward only known callbacks to this deployment, using the browser's
 * first-party session. Never forward incoming authorization or cookies. */
export async function handleIntegrationCallback(
  request: Request,
  options: { siteUrl: string; getToken: () => Promise<string | undefined> }
) {
  const incoming = new URL(request.url)
  const path = incoming.searchParams.get("callback") ?? ""
  if (!isIntegrationCallbackPath(path)) {
    return new Response("Unknown integration callback", {
      status: 400,
      headers: privateHeaders,
    })
  }
  const token = await options.getToken()
  if (token === undefined) {
    return new Response("Sign in and start the integration connection again.", {
      status: 401,
      headers: privateHeaders,
    })
  }
  const target = new URL(path, options.siteUrl)
  for (const name of ["code", "state", "installation_id", "error"]) {
    const value = incoming.searchParams.get(name)
    if (value !== null) {
      target.searchParams.set(name, value)
    }
  }
  const response = await fetch(target, {
    headers: { authorization: `Bearer ${token}` },
    redirect: "manual",
    cache: "no-store",
  })
  const headers = new Headers(privateHeaders)
  const location = response.headers.get("location")
  if (location !== null) {
    if (new URL(location, target).pathname === "/api/integrations/callback") {
      return new Response("Integration session could not be verified.", {
        status: 401,
        headers,
      })
    }
    headers.set("location", location)
  }
  return new Response(response.body, { status: response.status, headers })
}
