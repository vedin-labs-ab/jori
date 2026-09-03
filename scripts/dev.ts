import { packageCommand, runCommands } from "./process.ts"

// The two processes local development needs, so one command is the whole
// answer. They are independent: a Convex watcher that fails to start does not
// take the frontend with it.
await runCommands([packageCommand("dev:web"), packageCommand("dev:convex")])
