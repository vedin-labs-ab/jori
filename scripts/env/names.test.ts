import { expect, test } from "vitest"
import {
  deploymentNames,
  environmentFile,
  readTarget,
  targetRegion,
} from "./names.ts"

test("a target is one word that names its region and its env file", () => {
  expect(readTarget(["dev"])).toBe("dev")
  expect(readTarget(["prod-eu"])).toBe("prod-eu")
  expect(() => readTarget([])).toThrow("Choose a target")
  expect(() => readTarget(["prod"])).toThrow("Choose a target")
  expect(() => readTarget(["prod-us", "extra"])).toThrow("Choose a target")

  expect(targetRegion("dev")).toBeUndefined()
  expect(targetRegion("prod-eu")).toBe("eu")
  expect(targetRegion("prod-us")).toBe("us")

  expect(environmentFile("dev")).toBe(".env.local")
  expect(environmentFile("prod-us")).toBe(".env.prod-us.local")
})

test("deployment requires core services but not optional billing", () => {
  expect(deploymentNames).toEqual([
    "BETTER_AUTH_SECRET",
    "BIRD_API_KEY",
    "BIRD_WORKSPACE_ID",
    "E2B_API_KEY",
    "EXA_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "JORI_APP_URL",
    "JORI_E2B_TEMPLATE",
    "JORI_PUBLIC_ORIGIN",
    "JORI_REGION",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
    "OPENROUTER_API_KEY",
  ])
})
