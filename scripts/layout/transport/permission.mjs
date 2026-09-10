/** Test-only transport correction for the separate localhost layout preview.
 * The shared dev backend trusts localhost:5173. Permission checks are reads
 * carried over POST, and localhost:5178 would otherwise receive INVALID_ORIGIN.
 * Only this endpoint's Origin changes; responses and role data stay real.
 */
const permissionUrl =
  "http://localhost:5178/api/auth/organization/has-permission"
const approvedOrigin = "http://localhost:5173"

export const permissionOriginPatterns = [
  { urlPattern: permissionUrl, requestStage: "Request" },
]

export async function handlePermissionOriginRequest(cdp, event, onLog) {
  if (event.request.url !== permissionUrl || event.request.method !== "POST") {
    return false
  }
  const original = Object.entries(event.request.headers)
  const fromOrigin = original.find(
    ([name]) => name.toLowerCase() === "origin"
  )?.[1]
  // Only correct the known local preview origin, never an unrelated caller.
  if (fromOrigin !== "http://localhost:5178") {
    return false
  }
  const headers = original
    .filter(([name]) => name.toLowerCase() !== "origin")
    .map(([name, value]) => ({ name, value: String(value) }))
  headers.push({ name: "Origin", value: approvedOrigin })
  await cdp.send("Fetch.continueRequest", {
    requestId: event.requestId,
    headers,
  })
  onLog?.({
    kind: "permission-origin",
    url: permissionUrl,
    method: "POST",
    fromOrigin,
    toOrigin: approvedOrigin,
  })
  return true
}

/** Standalone wrapper. When composing with fault injection, share its CDP
 * dispatcher and import the patterns and handler above instead. */
export function wrapPermissionBrowser(browser, { onLog = () => {} } = {}) {
  return new Proxy(browser, {
    get(target, property) {
      if (property === "newContext") {
        return async (...args) =>
          wrapContext(await target.newContext(...args), onLog)
      }
      return bound(target, property)
    },
  })
}

function wrapContext(context, onLog) {
  return new Proxy(context, {
    get(target, property) {
      if (property === "newPage") {
        return async (...args) => {
          const page = await target.newPage(...args)
          const cdp = await target.newCDPSession(page)
          cdp.on("Fetch.requestPaused", (event) => {
            void handlePermissionOriginRequest(cdp, event, onLog)
              .then(async (handled) => {
                if (!handled) {
                  await cdp.send("Fetch.continueRequest", {
                    requestId: event.requestId,
                  })
                }
              })
              .catch((error) => {
                // Context closure can cancel an in-flight continuation.
                if (!page.isClosed()) {
                  onLog({
                    kind: "permission-transport-error",
                    message: String(error),
                  })
                }
              })
          })
          await cdp.send("Fetch.enable", { patterns: permissionOriginPatterns })
          return page
        }
      }
      return bound(target, property)
    },
  })
}

function bound(target, property) {
  const value = Reflect.get(target, property, target)
  return typeof value === "function" ? value.bind(target) : value
}
