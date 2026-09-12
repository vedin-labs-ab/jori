import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { vertexConfiguration } from "./config"

beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("VERTEX_PROJECT_ID", "jori-production-eu")
  vi.stubEnv(
    "VERTEX_CLIENT_EMAIL",
    "image-generation@jori-production-eu.iam.gserviceaccount.com"
  )
  vi.stubEnv("VERTEX_PRIVATE_KEY", "private-test-key")
})
afterEach(() => vi.unstubAllEnvs())

test.each(["eu", "us"])(
  "derives the entire inference route from JORI_REGION=%s",
  (region) => {
    vi.stubEnv("JORI_REGION", region)
    expect(vertexConfiguration().endpoint).toBe(
      `https://aiplatform.${region}.rep.googleapis.com/v1/projects/jori-production-eu/locations/${region}/publishers/google/models/gemini-3.1-flash-image:generateContent`
    )
  }
)

test.each([
  "JORI_REGION",
  "VERTEX_PROJECT_ID",
  "VERTEX_CLIENT_EMAIL",
  "VERTEX_PRIVATE_KEY",
])("fails closed when %s is missing", (name) => {
  vi.stubEnv(name, "")
  expect(() => vertexConfiguration()).toThrow(name)
})

test("rejects a service account from a different project", () => {
  vi.stubEnv(
    "VERTEX_CLIENT_EMAIL",
    "image-generation@jori-production-us.iam.gserviceaccount.com"
  )
  expect(() => vertexConfiguration()).toThrow("must belong")
})

test.each(["../other-project", "https://global.example"])(
  "rejects invalid project IDs",
  (project) => {
    vi.stubEnv("VERTEX_PROJECT_ID", project)
    expect(() => vertexConfiguration()).toThrow("VERTEX_PROJECT_ID")
  }
)
