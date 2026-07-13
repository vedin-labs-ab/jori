import path from "node:path"
import { fileURLToPath } from "node:url"

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
)
export const appSourceRoot = path.join(root, "src")
export const contractsRoot = path.join(root, "contracts")
export const sourceRoot = path.join(root, "runtime/artifacts")
export const generatedPath = path.join(
  root,
  "runtime/artifacts/_generated/assets.ts"
)

export function appSourcePath(relativePath: string) {
  return path.join(appSourceRoot, relativePath)
}

export function runtimeSourcePath(relativePath: string) {
  return path.join(sourceRoot, relativePath)
}
