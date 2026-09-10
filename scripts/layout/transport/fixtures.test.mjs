import assert from "node:assert/strict"
import { test } from "vitest"
import { wrapFaultBrowser } from "./faults.mjs"
import { handleSignout } from "./signout.mjs"
import { installSocketFixtures } from "./socket.mjs"

const tick = () => new Promise((resolve) => setImmediate(resolve))
function browserFixture() {
  const calls = [],
    listeners = {}
  const cdp = {
    on: (kind, callback) => (listeners[kind] = callback),
    send: async (kind, value) => {
      calls.push({ kind, value })
      return kind === "Fetch.getResponseBody"
        ? { body: '{"metadata":{"onboarded":true}}' }
        : {}
    },
  }
  const page = {
    goto: async () => {},
    on: () => {},
    locator: () => ({ click: async () => calls.push({ kind: "click" }) }),
  }
  const context = { newPage: async () => page, newCDPSession: async () => cdp }
  return {
    browser: { newContext: async () => context },
    page,
    calls,
    paused: async (url, method = "GET", headers = {}) => {
      listeners["Fetch.requestPaused"]({
        requestId: "1",
        request: { url, method, headers },
        responseStatusCode: 200,
      })
      await tick()
    },
  }
}
test("warm primer and unmatched requests retain normal HTTP path; measured fixture repeats and clears only for Retry", async () => {
  const f = browserFixture()
  const wrapped = wrapFaultBrowser(f.browser, {
    condition: "warm",
    faultRules: [
      {
        url: "http://localhost:5178/assets/jobs-*.js",
        status: 404,
        persistent: true,
      },
    ],
    releaseOnSelector: "retry",
  })
  const page = await (await wrapped.newContext()).newPage()
  await page.goto("/chat")
  await f.paused("http://localhost:5178/assets/jobs-one.js")
  assert.equal(f.calls.at(-1).kind, "Fetch.continueRequest")
  await page.goto("about:blank")
  await f.paused("http://localhost:5178/assets/jobs-one.js")
  assert.equal(f.calls.at(-1).kind, "Fetch.continueRequest")
  await page.goto("/chat")
  await f.paused("http://localhost:5178/assets/jobs-one.js")
  assert.equal(f.calls.at(-1).kind, "Fetch.fulfillRequest")
  await f.paused("http://localhost:5178/assets/other.js")
  assert.equal(f.calls.at(-1).kind, "Fetch.continueRequest")
  await f.paused("http://localhost:5178/assets/jobs-two.js")
  assert.equal(f.calls.at(-1).kind, "Fetch.fulfillRequest")
  await page.locator("retry").click()
  await f.paused("http://localhost:5178/assets/jobs-two.js")
  assert.equal(f.calls.at(-1).kind, "Fetch.continueRequest")
  assert.equal(
    f.calls.some((c) => /Cache|Network/.test(c.kind)),
    false
  )
})
test("response transform changes browser metadata without mutating original transport state", async () => {
  const f = browserFixture()
  const wrapped = wrapFaultBrowser(f.browser, {
    condition: "cold",
    faultRules: [
      {
        url: "http://localhost:5178/api/auth/organization/get-full-organization*",
        transform: (v) => ({
          ...v,
          metadata: { ...v.metadata, onboarded: false },
        }),
      },
    ],
  })
  const page = await (await wrapped.newContext()).newPage()
  await page.goto("/chat")
  await f.paused(
    "http://localhost:5178/api/auth/organization/get-full-organization?id=a"
  )
  const payload = JSON.parse(
    Buffer.from(f.calls.at(-1).value.body, "base64").toString()
  )
  assert.equal(payload.metadata.onboarded, false)
  assert.equal(f.calls[0].value.patterns[0].requestStage, "Response")
})
test("socket fixtures forward normal traffic and block only one exact mutation/query result", async () => {
  let connect, fromBrowser, fromServer
  const client = [],
    server = []
  const socket = {
    connectToServer: () => ({
      onMessage: (fn) => (fromServer = fn),
      send: (m) => server.push(m),
    }),
    onMessage: (fn) => (fromBrowser = fn),
    send: (m) => client.push(m),
  }
  const page = {
    routeWebSocket: async (pattern, fn) => {
      assert.equal(pattern, "**/api/*/sync")
      connect = fn
    },
  }
  await installSocketFixtures(page, {
    armed: () => true,
    queryRules: [{ udfPath: "jobs/console:get" }],
    mutationFailures: [{ udfPath: "persons/account:sync" }],
  })
  connect(socket)
  fromBrowser(
    JSON.stringify({
      type: "ModifyQuerySet",
      modifications: [{ type: "Add", queryId: 1, udfPath: "jobs/console:get" }],
    })
  )
  assert.equal(server.length, 1)
  const result = JSON.stringify({
    type: "Transition",
    modifications: [
      { type: "QueryUpdated", queryId: 1, value: { name: "job" } },
    ],
  })
  fromServer(result)
  assert.equal(JSON.parse(client.at(-1)).modifications[0].type, "QueryFailed")
  fromServer(result)
  assert.equal(client.at(-1), result)
  const mutation = JSON.stringify({
    type: "Mutation",
    requestId: 7,
    udfPath: "persons/account:sync",
  })
  fromBrowser(mutation)
  assert.equal(server.length, 1)
  assert.equal(JSON.parse(client.at(-1)).success, false)
  fromBrowser(mutation)
  assert.equal(server.at(-1), mutation)
})
test("cross-origin preflight does not consume one-shot response and fixture supplies CORS headers", async () => {
  const f = browserFixture()
  const wrapped = wrapFaultBrowser(f.browser, {
    condition: "cold",
    faultRules: [
      {
        url: "https://audit.convex.site/waitlist",
        status: 200,
        body: '{"status":"joined"}',
      },
    ],
  })
  const page = await (await wrapped.newContext()).newPage()
  await page.goto("/")
  await f.paused("https://audit.convex.site/waitlist", "OPTIONS", {
    Origin: "http://localhost:5178",
  })
  assert.equal(f.calls.at(-1).kind, "Fetch.fulfillRequest")
  await f.paused("https://audit.convex.site/waitlist", "POST", {
    Origin: "http://localhost:5178",
  })
  assert.equal(f.calls.at(-1).kind, "Fetch.fulfillRequest")
  assert.equal(
    f.calls
      .at(-1)
      .value.responseHeaders.find(
        (h) => h.name === "Access-Control-Allow-Origin"
      ).value,
    "http://localhost:5178"
  )
  assert.ok(
    f.calls
      .at(-1)
      .value.responseHeaders.some(
        (h) => h.name === "Access-Control-Allow-Origin"
      )
  )
})
test("signout clears only the current context auth cookies and never forwards its POST", async () => {
  const calls = [],
    logs = []
  const context = {
    cookies: async () => [
      { name: "better-auth.session_token" },
      { name: "better-auth.convex_jwt" },
      { name: "sidebar_state" },
    ],
    clearCookies: async (options) => calls.push({ kind: "clear", options }),
  }
  const cdp = { send: async (kind, options) => calls.push({ kind, options }) }
  const event = {
    requestId: "signout",
    request: { url: "http://localhost:5178/api/auth/sign-out", method: "POST" },
  }
  assert.equal(
    await handleSignout(cdp, context, event, (e) => logs.push(e)),
    true
  )
  assert.deepEqual(
    calls.slice(0, 2).map((c) => c.options),
    [
      { name: "better-auth.session_token", domain: "localhost" },
      { name: "better-auth.convex_jwt", domain: "localhost" },
    ]
  )
  assert.equal(calls.at(-1).kind, "Fetch.fulfillRequest")
  assert.equal(
    calls.some((c) => c.kind === "Fetch.continueRequest"),
    false
  )
  assert.equal(logs[0].backendForwarded, false)
  assert.equal(
    await handleSignout(
      cdp,
      context,
      { ...event, request: { ...event.request, method: "GET" } },
      () => {}
    ),
    false
  )
})
