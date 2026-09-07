import { expect, test } from "vitest"
import { deploymentNames } from "./names.ts"

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
