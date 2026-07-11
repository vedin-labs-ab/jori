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
  processKeepAlive: {
    enabled: true,
    maxExecutionsPerProcess: 25,
  },
})
