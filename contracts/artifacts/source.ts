export const artifactEntrypoint = "src/main.tsx"
const requiredArtifactSourcePaths = ["src/App.tsx", "src/contract.ts"] as const

export type ArtifactSourceFile = {
  path: string
  content: string
  executable?: boolean
}

export type NormalizedArtifactSourceFile = {
  path: string
  content: string
  executable: boolean
  byteSize: number
}

const platformArtifactSourcePaths = [
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

const platformArtifactSourcePathPrefixes = [
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
const maxArtifactTreeBytes = 2 * 1024 * 1024

export function normalizeArtifactSourceFiles(
  source: unknown
): NormalizedArtifactSourceFile[] {
  if (!Array.isArray(source) || source.length === 0) {
    throw new Error("Artifact source must include files.")
  }

  if (source.length > maxArtifactFiles) {
    throw new Error(`Artifacts can include at most ${maxArtifactFiles} files.`)
  }

  const paths = new Set<string>()
  const files = source.map((file) => normalizeSourceFile(file, paths))

  for (const requiredPath of requiredArtifactSourcePaths) {
    if (!paths.has(requiredPath)) {
      throw new Error(`Artifact source is missing ${requiredPath}.`)
    }
  }

  const totalBytes = files.reduce((sum, file) => sum + file.byteSize, 0)

  if (totalBytes > maxArtifactTreeBytes) {
    throw new Error(
      `Artifact source exceeds ${maxArtifactTreeBytes} total bytes.`
    )
  }

  const sortedFiles = files.sort((left, right) =>
    left.path.localeCompare(right.path)
  )
  rejectForbiddenSourceAccess(sortedFiles)

  return sortedFiles
}

function normalizeSourceFile(
  value: unknown,
  paths: Set<string>
): NormalizedArtifactSourceFile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Artifact source files must be objects.")
  }

  const candidate = value as Partial<ArtifactSourceFile>
  const path = normalizeSourceFilePath(candidate.path)

  if (paths.has(path)) {
    throw new Error(`Duplicate artifact source path: ${path}`)
  }

  paths.add(path)

  if (typeof candidate.content !== "string") {
    throw new Error(`Artifact source file ${path} must be text.`)
  }

  const byteSize = new TextEncoder().encode(candidate.content).byteLength

  if (byteSize === 0) {
    throw new Error(`Artifact source file ${path} is empty.`)
  }

  if (byteSize > maxArtifactFileBytes) {
    throw new Error(
      `Artifact source file ${path} exceeds ${maxArtifactFileBytes} bytes.`
    )
  }

  return {
    path,
    content: candidate.content,
    executable: candidate.executable === true,
    byteSize,
  }
}

function normalizeSourceFilePath(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Artifact source path must be a string.")
  }

  const path = normalizeArtifactSourcePath(value)

  if (isPlatformArtifactSourcePath(path)) {
    throw new Error(
      `Artifact source cannot include platform-owned file: ${path}`
    )
  }

  return path
}

function normalizeArtifactSourcePath(path: string) {
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
  /\bbetter-auth\b/,
  /\b@convex-dev\/better-auth\b/,
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
