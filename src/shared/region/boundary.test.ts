import { expect, test } from "vitest"
import { type RegionConfig } from "./config"
import { handleRegionRequest } from "./routing"

const config: RegionConfig = {
  current: "us",
  enabled: new Set(["eu", "us"]),
  publicOrigin: "https://usejori.com",
  origins: { eu: "https://eu.usejori.com", us: "https://us.usejori.com" },
}

test.each([
  "/",
  "/pricing",
  "/trust",
  "/terms",
  "/privacy",
])("public marketing %s never selects a session", (path) => {
  expect(
    handleRegionRequest(
      new Request(`https://usejori.com${path}`, {
        headers: {
          cookie: "jori_region=eu; session=private",
          "x-vercel-ip-country": "US",
        },
      }),
      config
    )
  ).toBeNull()
})

test.each([
  "/pricing",
  "/trust",
  "/terms",
  "/privacy",
])("regional marketing %s returns to apex without private query data", (path) => {
  const response = handleRegionRequest(
    new Request(`https://us.usejori.com${path}?token=private`),
    config
  )
  expect(response?.headers.get("location")).toBe(`https://usejori.com${path}`)
  expect(response?.headers.get("referrer-policy")).toBe("no-referrer")
  expect(response?.headers.get("set-cookie")).toBeNull()
})

test("the regional root enters the console, which owns the sign-in gate", () => {
  expect(
    handleRegionRequest(
      new Request("https://us.usejori.com/"),
      config
    )?.headers.get("location")
  ).toBe("https://us.usejori.com/console")
})

test("only the public region preference crosses the sign-in boundary", () => {
  const response = handleRegionRequest(
    new Request(
      "https://usejori.com/sign-in?token=private&returnTo=/files/secret",
      { headers: { cookie: "jori_region=eu" } }
    ),
    config
  )
  expect(response?.headers.get("location")).toBe(
    "https://eu.usejori.com/sign-in"
  )
  expect(response?.headers.get("referrer-policy")).toBe("no-referrer")
})

test.each([
  "GET",
  "POST",
])("public auth %s cannot reach a backend", (method) => {
  const response = handleRegionRequest(
    new Request("https://usejori.com/api/auth/get-session", { method }),
    config
  )
  expect(response?.status).toBe(404)
  expect(response?.headers.get("location")).toBeNull()
})

test("www never forwards a credential-bearing write", () => {
  const response = handleRegionRequest(
    new Request("https://www.usejori.com/sign-in", {
      method: "POST",
      body: "secret",
    }),
    config
  )
  expect(response?.status).toBe(421)
  expect(response?.headers.get("location")).toBeNull()
})

test("region switching ignores any supplied return path and sets a host-only choice", () => {
  const response = handleRegionRequest(
    new Request("https://usejori.com/region/eu?returnTo=/files/private"),
    config
  )
  expect(response?.headers.get("location")).toBe(
    "https://eu.usejori.com/sign-in"
  )
  expect(response?.headers.get("set-cookie")).toContain("jori_region=eu")
  expect(response?.headers.get("set-cookie")).not.toContain("Domain=")
})

test("matching US build accepts proxy-origin requests but an EU build fails closed", () => {
  const request = new Request("http://internal.service/sign-in", {
    headers: { "x-forwarded-host": "us.usejori.com" },
  })
  expect(handleRegionRequest(request, config)).toBeNull()
  expect(
    handleRegionRequest(request, { ...config, current: "eu" })?.status
  ).toBe(421)
})
