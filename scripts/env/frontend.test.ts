import { expect, test } from "vitest"
import { frontendNames, validateFrontend } from "./frontend.ts"

function settings() {
  const env: NodeJS.ProcessEnv = {
    ...Object.fromEntries(frontendNames.map((name) => [name, `value-${name}`])),
    VERCEL_PROJECT_ID: "project-eu",
  }
  const project = {
    id: "project-eu",
    name: "jori-production-eu",
    resourceConfig: {
      functionDefaultRegions: ["dub1"],
      functionZeroConfigFailover: false,
    },
    env: frontendNames.map((key) => ({
      key,
      value: env[key],
      target: ["production"],
    })),
  }
  return { env, project }
}

test("checks remote build settings against the selected regional target", () => {
  const { env, project } = settings()
  expect(() => validateFrontend(project, env, "eu")).not.toThrow()
  expect(() => validateFrontend(project, env, "us")).toThrow("regional target")
  expect(() => validateFrontend({ ...project, env: [] }, env, "eu")).toThrow(
    "configuration differs"
  )
})

test("rejects multi-region compute and automatic failover", () => {
  const { env, project } = settings()
  for (const resourceConfig of [
    {
      functionDefaultRegions: ["dub1", "iad1"],
      functionZeroConfigFailover: false,
    },
    { functionDefaultRegions: ["dub1"], functionZeroConfigFailover: true },
  ]) {
    expect(() =>
      validateFrontend({ ...project, resourceConfig }, env, "eu")
    ).toThrow("without failover")
  }
})
