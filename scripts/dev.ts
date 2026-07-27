import { packageCommand, runCommands } from "./process.ts"

// The three processes local development needs, so one command is the whole
// answer. They are independent: a Trigger worker that fails to start does not
// take the frontend or the Convex watcher with it.
await runCommands([
  packageCommand("dev:web"),
  packageCommand("dev:convex"),
  packageCommand("dev:trigger"),
])
