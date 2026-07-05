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

// The platform validator and the sandbox builder both enforce the rules
// below; they live here so the two sides cannot drift apart.

export const maxArtifactFiles = 120
export const maxArtifactFileBytes = 512 * 1024
export const maxArtifactTreeBytes = 2 * 1024 * 1024

export function normalizeArtifactSourcePath(path: string) {
  const normalized = path.trim().replaceAll("\\", "/")

  if (normalized === "") {
    throw new Error("Artifact source paths cannot be empty.")
  }

  if (normalized.startsWith("/") || normalized.endsWith("/")) {
    throw new Error(`Artifact source path must be relative: ${path}`)
  }

  const segments = normalized.split("/")

  if (
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        segment.includes("\0")
    )
  ) {
    throw new Error(`Artifact source path is not allowed: ${path}`)
  }

  if (segments.some((segment) => segment === "node_modules")) {
    throw new Error("Artifact source cannot include node_modules.")
  }

  if (segments[0] === "dist") {
    throw new Error("Artifact source cannot include build output.")
  }

  return segments.join("/")
}

const forbiddenSourcePatterns = [
  /\bconvex\/react\b/,
  /\b@clerk\b/,
  /\bprocess\.env\b/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
]

export function rejectForbiddenSourceAccess(
  files: Array<{ path: string; content: string }>
) {
  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file.path)) {
      continue
    }

    const match = forbiddenSourcePatterns.find((pattern) =>
      pattern.test(file.content)
    )

    if (match !== undefined) {
      throw new Error(
        `Artifact source file ${file.path} uses a forbidden platform API. Use the Milo SDK instead.`
      )
    }
  }
}

// Builder and platform hash this same projection with sha256; the platform
// accepts a build only when both hashes agree.
export function artifactSourceHashInput(
  files: Array<{ path: string; content: string; executable: boolean }>
) {
  return JSON.stringify(
    files.map((file) => ({
      path: file.path,
      content: file.content,
      executable: file.executable,
    }))
  )
}
