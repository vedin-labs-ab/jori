import { platformSourcePathPrefixes, platformSourcePaths } from "./config.ts"

export function isPlatformSourcePath(filePath: string) {
  return (
    platformSourcePaths.has(filePath) ||
    platformSourcePathPrefixes.some((prefix) => filePath.startsWith(prefix))
  )
}
