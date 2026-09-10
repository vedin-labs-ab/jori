import assert from "node:assert/strict"
import { test } from "vitest"
import { handlePermissionOriginRequest } from "./permission.mjs"

test("permission transport uses the dev origin only for the preview permission POST", async () => {
  const calls = []
  const cdp = { send: async (kind, value) => calls.push({ kind, value }) }
  const request = {
    url: "http://localhost:5178/api/auth/organization/has-permission",
    method: "POST",
    headers: {
      Origin: "http://localhost:5178",
      "Content-Type": "application/json",
    },
  }
  const event = { requestId: "permission", request }

  assert.equal(await handlePermissionOriginRequest(cdp, event), true)
  assert.deepEqual(calls[0].value.headers, [
    { name: "Content-Type", value: "application/json" },
    { name: "Origin", value: "http://localhost:8050" },
  ])
  for (const change of [
    { method: "GET" },
    { url: "http://localhost:5178/api/auth/sign-out" },
    { headers: { Origin: "https://unrelated.example" } },
  ]) {
    assert.equal(
      await handlePermissionOriginRequest(cdp, {
        ...event,
        request: { ...request, ...change },
      }),
      false
    )
  }
  assert.equal(calls.length, 1)
})
