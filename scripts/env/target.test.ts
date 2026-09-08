import { expect, test } from "vitest"
import { validateTarget } from "./target.ts"

function target(region: "eu" | "us") {
  const host = region === "eu" ? "deployment.eu-west-1" : "deployment"
  return {
    CONVEX_DEPLOYMENT: "prod:deployment",
    CONVEX_DEPLOY_KEY: "prod:deployment|test",
    VERCEL_PROJECT_ID: "project",
    VERCEL_ORG_ID: "team",
    VITE_CONVEX_URL: `https://${host}.convex.cloud`,
    VITE_CONVEX_SITE_URL: `https://${host}.convex.site`,
    VITE_JORI_REGION: region,
    [`VITE_JORI_${region.toUpperCase()}_SITE_URL`]: `https://${host}.convex.site`,
  }
}

test("rejects a frontend built for the other region", () => {
  expect(() => validateTarget(target("us"), "eu")).toThrow("Frontend region")
})

test("rejects crossed backend URLs and deployment keys", () => {
  expect(() => validateTarget(target("eu"), "eu")).not.toThrow()
  expect(() =>
    validateTarget(
      { ...target("eu"), VITE_CONVEX_URL: target("us").VITE_CONVEX_URL },
      "eu"
    )
  ).toThrow("same Convex deployment")
  expect(() =>
    validateTarget(
      { ...target("eu"), CONVEX_DEPLOY_KEY: "prod:other|test" },
      "eu"
    )
  ).toThrow("exact production deployment")
})
