import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { appConsoleLink, appShareLink } from "./serve/urls"

describe("app console links", () => {
  test("returns a console path without an app origin", () => {
    expect(appConsoleLink("app_1" as Id<"apps">, {})).toEqual({
      urlPath: "/apps/app_1",
    })
  })

  test("returns a full URL when the app origin is configured", () => {
    expect(
      appConsoleLink("app_1" as Id<"apps">, {
        JORI_APP_URL: "https://app.jori.example/",
      })
    ).toEqual({
      url: "https://app.jori.example/apps/app_1",
      urlPath: "/apps/app_1",
    })
  })

  test("falls back to the first app frame ancestor", () => {
    expect(
      appConsoleLink("app_1" as Id<"apps">, {
        JORI_APP_FRAME_ANCESTORS:
          "https://app.jori.example https://preview.jori.example",
      })
    ).toEqual({
      url: "https://app.jori.example/apps/app_1",
      urlPath: "/apps/app_1",
    })
  })

  test("rejects app URLs with paths", () => {
    expect(() =>
      appConsoleLink("app_1" as Id<"apps">, {
        JORI_APP_URL: "https://app.jori.example/console",
      })
    ).toThrow("JORI_APP_URL must be an http(s) origin")
  })
})

describe("app share links", () => {
  test("appends the share fragment to the console path", () => {
    expect(appShareLink("app_1" as Id<"apps">, "s3cret", {})).toEqual({
      urlPath: "/apps/app_1#share=s3cret",
    })
  })

  test("appends the share fragment to the full URL", () => {
    expect(
      appShareLink("app_1" as Id<"apps">, "s3cret", {
        JORI_APP_URL: "https://app.jori.example/",
      })
    ).toEqual({
      url: "https://app.jori.example/apps/app_1#share=s3cret",
      urlPath: "/apps/app_1#share=s3cret",
    })
  })
})
