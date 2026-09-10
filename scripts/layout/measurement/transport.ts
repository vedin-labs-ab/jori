import { type Page } from "playwright"
import { type Scenario } from "../types.ts"

/** CDP interception leaves unrelated warm-cache assets enabled. */
export async function installResponses(
  page: Page,
  scenario: Scenario,
  onError: (message: string) => void
) {
  const responses = scenario.responses ?? []
  const events: { url: string; method: string; status: number }[] = []
  if (!responses.length) {
    return events
  }
  const cdp = await page.context().newCDPSession(page)
  const patterns = responses.map((response) => ({
    urlPattern: response.url,
    requestStage: "Request" as const,
  }))
  cdp.on("Fetch.requestPaused", (event) => {
    void (async () => {
      const response = responses.find((item) =>
        matches(item.url, event.request.url)
      )
      if (!response) {
        await cdp.send("Fetch.continueRequest", { requestId: event.requestId })
        return
      }
      const preflight = event.request.method === "OPTIONS"
      if (!preflight && response.delay) {
        await page.waitForTimeout(response.delay)
      }
      const status = preflight ? 204 : (response.status ?? 200)
      events.push({
        url: event.request.url,
        method: event.request.method,
        status,
      })
      await cdp.send("Fetch.fulfillRequest", {
        requestId: event.requestId,
        responseCode: status,
        responseHeaders: responseHeaders(event.request.headers),
        body: Buffer.from(preflight ? "" : response.body).toString("base64"),
      })
    })().catch((error) => {
      if (!page.isClosed()) {
        onError(String(error))
      }
    })
  })
  await cdp.send("Fetch.enable", { patterns })
  return events
}

function responseHeaders(headers: Record<string, string>) {
  const header = (name: string) =>
    Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1]
  return [
    { name: "Content-Type", value: "application/json" },
    { name: "Cache-Control", value: "no-store" },
    { name: "Access-Control-Allow-Origin", value: header("origin") ?? "*" },
    { name: "Access-Control-Allow-Credentials", value: "true" },
    { name: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
    {
      name: "Access-Control-Allow-Headers",
      value: header("access-control-request-headers") ?? "content-type",
    },
  ]
}

function matches(pattern: string, value: string) {
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*")
  return new RegExp(`^${escaped}$`).test(value)
}

/** Each document gets a private clipboard; no OS clipboard is read or changed. */
export async function installClipboard(
  page: Page,
  fixture: Scenario["clipboard"]
) {
  if (!fixture) {
    return
  }
  await page.addInitScript((initial) => {
    let text = initial.text ?? ""
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async readText() {
          if (initial.readError) {
            throw new DOMException(
              "Fixture clipboard refusal",
              "NotAllowedError"
            )
          }
          return text
        },
        async writeText(value: string) {
          if (initial.writeError) {
            throw new DOMException(
              "Fixture clipboard refusal",
              "NotAllowedError"
            )
          }
          text = value
        },
      },
    })
  }, fixture)
}
