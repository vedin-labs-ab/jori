import { handleSignout, signoutPattern } from "./signout.mjs"

export async function installHttpFixtures(page, context, config, state) {
  const cdp = await context.newCDPSession(page)
  const patterns = [
    ...config.faultRules.map((rule) => ({
      urlPattern: rule.url,
      requestStage: rule.transform ? "Response" : "Request",
    })),
    ...(config.permission?.patterns ?? []),
    ...(config.signoutFixture ? [signoutPattern] : []),
  ]
  const pending = new Set()
  cdp.on("Fetch.requestPaused", (event) => {
    const operation = dispatch(cdp, context, event, config, state).catch(
      (error) => {
        config.onLog({ kind: "interception-error", message: error.message })
      }
    )
    pending.add(operation)
    void operation.finally(() => pending.delete(operation))
  })
  if (patterns.length) {
    await cdp.send("Fetch.enable", { patterns })
  }
  page.on("close", () => {
    void Promise.allSettled([...pending])
  })
}

async function dispatch(cdp, context, event, config, state) {
  if (
    config.permission &&
    (await config.permission.handle(cdp, event, config.onLog))
  ) {
    return
  }
  if (
    config.signoutFixture &&
    (await handleSignout(cdp, context, event, config.onLog))
  ) {
    return
  }
  const rule = selectedRule(event, config.faultRules, state)
  if (!rule) {
    await cdp.send("Fetch.continueRequest", { requestId: event.requestId })
    return
  }
  if (rule.delay && event.request.method !== "OPTIONS") {
    await new Promise((resolve) => setTimeout(resolve, rule.delay))
  }
  const body = await responseBody(cdp, event, rule)
  const status =
    rule.status ?? (rule.transform ? event.responseStatusCode : 404)
  config.onLog({
    kind: "one-shot-fault",
    url: event.request.url,
    method: event.request.method,
    status,
  })
  await cdp.send("Fetch.fulfillRequest", {
    requestId: event.requestId,
    responseCode: status,
    responseHeaders: headers(event, rule),
    body: Buffer.from(body).toString("base64"),
  })
}

function selectedRule(event, rules, state) {
  if (!state.armed || state.released) {
    return undefined
  }
  const index = rules.findIndex((rule) => matches(rule.url, event.request.url))
  if (index < 0 || (!rules[index].persistent && state.used.has(index))) {
    return undefined
  }
  if (event.request.method !== "OPTIONS") {
    state.used.add(index)
  }
  return rules[index]
}

async function responseBody(cdp, event, rule) {
  if (!rule.transform) {
    return rule.body ?? "{}"
  }
  const response = await cdp.send("Fetch.getResponseBody", {
    requestId: event.requestId,
  })
  const text = response.base64Encoded
    ? Buffer.from(response.body, "base64").toString("utf8")
    : response.body
  return JSON.stringify(rule.transform(JSON.parse(text)))
}

function headers(event, rule) {
  const value = (name) =>
    Object.entries(event.request.headers ?? {}).find(
      ([key]) => key.toLowerCase() === name
    )?.[1]
  return [
    { name: "Content-Type", value: rule.contentType ?? "application/json" },
    { name: "Cache-Control", value: "no-store" },
    { name: "Access-Control-Allow-Origin", value: value("origin") ?? "*" },
    { name: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
    {
      name: "Access-Control-Allow-Headers",
      value: value("access-control-request-headers") ?? "content-type",
    },
    { name: "Access-Control-Allow-Credentials", value: "true" },
  ]
}

function matches(pattern, value) {
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*")
  return new RegExp(`^${escaped}$`).test(value)
}
