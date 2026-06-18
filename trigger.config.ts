import { defineConfig } from "@trigger.dev/sdk/v3"

const project = process.env.TRIGGER_PROJECT_REF?.trim()

if (project === undefined || project === "") {
  throw new Error("Missing TRIGGER_PROJECT_REF")
}

export default defineConfig({
  project,
  dirs: ["trigger/tasks"],
  runtime: "node-22",
  maxDuration: 7200,
  retries: {
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 60_000,
      factor: 2,
      randomize: true,
    },
  },
})
