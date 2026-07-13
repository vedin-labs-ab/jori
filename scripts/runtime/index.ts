import { generateRuntimeAssets } from "./generate.ts"

generateRuntimeAssets({ checkMode: process.argv.includes("--check") })
