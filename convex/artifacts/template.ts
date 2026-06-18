export const artifactEntrypoint = "src/main.tsx"
export const requiredArtifactSourcePaths = [
  "src/App.tsx",
  "src/contract.ts",
] as const

export const platformArtifactSourcePaths = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  ".npmrc",
  "index.html",
  "biome.json",
  "eslint.config.js",
  "eslint.config.mjs",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.ts",
  artifactEntrypoint,
  "src/vite-env.d.ts",
  "src/hooks/use-mobile.ts",
  "src/lib/utils.ts",
  "src/milo.ts",
  "src/milo.css",
] as const

export const platformArtifactSourcePathPrefixes = [
  "src/components/ui/",
  "src/milo/",
] as const

export function isPlatformArtifactSourcePath(path: string) {
  return (
    (platformArtifactSourcePaths as readonly string[]).includes(path) ||
    platformArtifactSourcePathPrefixes.some((prefix) => path.startsWith(prefix))
  )
}
