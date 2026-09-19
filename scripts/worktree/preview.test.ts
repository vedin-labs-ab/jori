import { expect, test } from "vitest"
import { previewEnvFile, previewSettings, previewSources } from "./preview"

const url = "https://calm-otter-12.eu-west-1.convex.cloud"

test("a PREVIEW_ variable stands in for the one it names, in either order", () => {
  expect([
    ...previewSources([
      "OPENROUTER_API_KEY",
      "PREVIEW_R2_SECRET_ACCESS_KEY",
      "R2_SECRET_ACCESS_KEY",
    ]),
  ]).toEqual([
    ["OPENROUTER_API_KEY", "OPENROUTER_API_KEY"],
    ["R2_SECRET_ACCESS_KEY", "PREVIEW_R2_SECRET_ACCESS_KEY"],
  ])
  expect(
    previewSources(["R2_BUCKET", "PREVIEW_R2_BUCKET"]).get("R2_BUCKET")
  ).toBe("PREVIEW_R2_BUCKET")
})

test("a preview takes its region from its URL and serves the worktree's origin", () => {
  expect(previewSettings(url)).toMatchObject({ JORI_REGION: "eu" })
  expect(previewEnvFile("calm-otter-12", url)).toContain(
    "VITE_CONVEX_SITE_URL=https://calm-otter-12.eu-west-1.convex.site\nVITE_JORI_REGION=eu"
  )
  expect(
    previewSettings("https://calm-otter-12.convex.cloud").JORI_REGION
  ).toBe("us")
})
