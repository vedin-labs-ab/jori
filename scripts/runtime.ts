import { generateRuntimeAssets } from "./runtime/generate.ts"

generateRuntimeAssets({ checkMode: process.argv.includes("--check") })
