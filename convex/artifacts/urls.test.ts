import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { artifactConsoleLink } from "./serve/urls"

describe("artifact console links", () => {
  test("returns a console path without an app origin", () => {
    expect(artifactConsoleLink("artifact_1" as Id<"artifacts">, {})).toEqual({
      urlPath: "/artifacts/artifact_1",
    })
  })

  test("returns a full URL when the app origin is configured", () => {
    expect(
      artifactConsoleLink("artifact_1" as Id<"artifacts">, {
        MILO_APP_URL: "https://app.milo.example/",
      })
    ).toEqual({
      url: "https://app.milo.example/artifacts/artifact_1",
      urlPath: "/artifacts/artifact_1",
    })
  })

  test("falls back to the first artifact frame ancestor", () => {
    expect(
      artifactConsoleLink("artifact_1" as Id<"artifacts">, {
        MILO_ARTIFACT_FRAME_ANCESTORS:
          "https://app.milo.example https://preview.milo.example",
      })
    ).toEqual({
      url: "https://app.milo.example/artifacts/artifact_1",
      urlPath: "/artifacts/artifact_1",
    })
  })

  test("rejects app URLs with paths", () => {
    expect(() =>
      artifactConsoleLink("artifact_1" as Id<"artifacts">, {
        MILO_APP_URL: "https://app.milo.example/console",
      })
    ).toThrow("MILO_APP_URL must be an http(s) origin")
  })
})
