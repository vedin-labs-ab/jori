// @vitest-environment edge-runtime
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import {
  base64DecodeBytes,
  base64EncodeBytes,
  base64UrlDecode,
} from "../../../../shared/encoding"

const fetchMock = vi.fn()
beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () =>
    Response.json({ access_token: "access-test", expires_in: 3600 })
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test("signs a service-account assertion and caches only an unexpired credential-matched token", async () => {
  const { vertexAccessToken } = await import("./auth")
  const credentials = await keyPair()
  expect(await vertexAccessToken(credentials)).toBe("access-test")
  expect(await vertexAccessToken(credentials)).toBe("access-test")
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toBe("https://oauth2.googleapis.com/token")
  expect(options.redirect).toBe("error")
  const jwt = options.body.get("assertion")
  const [header, claims, signature] = jwt.split(".")
  expect(JSON.parse(base64UrlDecode(header))).toEqual({
    alg: "RS256",
    typ: "JWT",
  })
  expect(JSON.parse(base64UrlDecode(claims))).toMatchObject({
    iss: credentials.clientEmail,
    aud: url,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  })
  expect(
    await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      credentials.publicKey,
      base64DecodeBytes(signature.replaceAll("-", "+").replaceAll("_", "/")),
      new TextEncoder().encode(`${header}.${claims}`)
    )
  ).toBe(true)
  await vertexAccessToken({
    ...credentials,
    clientEmail: "another@project.iam.gserviceaccount.com",
  })
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test("refreshes expired tokens and redacts authentication failures", async () => {
  const { vertexAccessToken } = await import("./auth")
  const credentials = await keyPair()
  await vertexAccessToken(credentials)
  vi.useFakeTimers()
  vi.setSystemTime(Date.now() + 3600_000)
  fetchMock.mockResolvedValue(
    new Response("private provider error", { status: 401 })
  )
  await expect(vertexAccessToken(credentials)).rejects.toThrow(
    "Vertex authentication failed (401)."
  )
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test("rejects malformed private keys before calling Google", async () => {
  const { vertexAccessToken } = await import("./auth")
  await expect(
    vertexAccessToken({ clientEmail: "test", privateKey: "not a PEM" })
  ).rejects.toThrow("PKCS8")
  expect(fetchMock).not.toHaveBeenCalled()
})

async function keyPair() {
  const keys = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  )
  const pem = base64EncodeBytes(
    new Uint8Array(await crypto.subtle.exportKey("pkcs8", keys.privateKey))
  )
  return {
    publicKey: keys.publicKey,
    clientEmail: "image-generation@jori-production-eu.iam.gserviceaccount.com",
    privateKey: `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`,
  }
}
