const endpoint = "http://localhost:5178/api/auth/sign-out"
export const signoutPattern = { urlPattern: endpoint, requestStage: "Request" }

// The actual client hook runs. Only its isolated browser loses its cookies;
// the request never reaches the backend and the shared saved session survives.
export async function handleSignout(cdp, context, event, onLog) {
  if (event.request.url !== endpoint || event.request.method !== "POST") {
    return false
  }
  const cookies = await context.cookies(endpoint)
  const names = cookies
    .filter((cookie) => cookie.name.startsWith("better-auth."))
    .map((cookie) => cookie.name)
  for (const name of names) {
    await context.clearCookies({ name, domain: "localhost" })
  }
  onLog({
    kind: "context-signout",
    url: endpoint,
    method: "POST",
    clearedCookieNames: names,
    backendForwarded: false,
  })
  await new Promise((resolve) => setTimeout(resolve, 850))
  await cdp.send("Fetch.fulfillRequest", {
    requestId: event.requestId,
    responseCode: 200,
    responseHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "Cache-Control", value: "no-store" },
    ],
    body: Buffer.from('{"success":true}').toString("base64"),
  })
  return true
}
