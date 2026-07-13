import { expect, test } from "vitest"
import { memberArtifactUrl } from "./fragment"

test("removes the share secret while preserving the artifact view", () => {
  expect(
    memberArtifactUrl({
      hash: "#share=secret&d=2026-07-13&m=event",
      pathname: "/artifacts/artifact",
      search: "?preview=1",
    })
  ).toBe("/artifacts/artifact?preview=1#d=2026-07-13&m=event")
})

test("removes an otherwise empty share fragment", () => {
  expect(
    memberArtifactUrl({
      hash: "#share=secret",
      pathname: "/artifacts/artifact",
      search: "",
    })
  ).toBe("/artifacts/artifact")
})

test("leaves regular artifact fragments alone", () => {
  expect(
    memberArtifactUrl({
      hash: "#d=2026-07-13",
      pathname: "/artifacts/artifact",
      search: "",
    })
  ).toBeNull()
})
