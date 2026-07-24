export const appEntrypoint = "src/main.tsx"
const requiredAppSourcePaths = ["src/App.tsx", "src/contract.ts"] as const

export type AppSourceFile = {
  path: string
  content: string
  executable?: boolean
}

export type NormalizedAppSourceFile = {
  path: string
  content: string
  executable: boolean
  byteSize: number
}

const platformAppSourcePaths = [
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
  appEntrypoint,
  "src/vite-env.d.ts",
  "src/hooks/use-mobile.ts",
  "src/lib/utils.ts",
  "src/milo.ts",
  "src/milo.css",
] as const

const platformAppSourcePathPrefixes = [
  "src/components/ui/",
  "src/milo/",
] as const

export function isPlatformAppSourcePath(path: string) {
  return (
    (platformAppSourcePaths as readonly string[]).includes(path) ||
    platformAppSourcePathPrefixes.some((prefix) => path.startsWith(prefix))
  )
}

// The platform validator and the sandbox builder both enforce the rules
// below; they live here so the two sides cannot drift apart.

export const maxAppFiles = 120
export const maxAppFileBytes = 512 * 1024
const maxAppTreeBytes = 2 * 1024 * 1024

export function normalizeAppSourceFiles(
  source: unknown
): NormalizedAppSourceFile[] {
  if (!Array.isArray(source) || source.length === 0) {
    throw new Error("App source must include files.")
  }

  if (source.length > maxAppFiles) {
    throw new Error(`Apps can include at most ${maxAppFiles} files.`)
  }

  const paths = new Set<string>()
  const files = source.map((file) => normalizeSourceFile(file, paths))

  for (const requiredPath of requiredAppSourcePaths) {
    if (!paths.has(requiredPath)) {
      throw new Error(`App source is missing ${requiredPath}.`)
    }
  }

  const totalBytes = files.reduce((sum, file) => sum + file.byteSize, 0)

  if (totalBytes > maxAppTreeBytes) {
    throw new Error(`App source exceeds ${maxAppTreeBytes} total bytes.`)
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
): NormalizedAppSourceFile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("App source files must be objects.")
  }

  const candidate = value as Partial<AppSourceFile>
  const path = normalizeSourceFilePath(candidate.path)

  if (paths.has(path)) {
    throw new Error(`Duplicate app source path: ${path}`)
  }

  paths.add(path)

  if (typeof candidate.content !== "string") {
    throw new Error(`App source file ${path} must be text.`)
  }

  const byteSize = new TextEncoder().encode(candidate.content).byteLength

  if (byteSize === 0) {
    throw new Error(`App source file ${path} is empty.`)
  }

  if (byteSize > maxAppFileBytes) {
    throw new Error(`App source file ${path} exceeds ${maxAppFileBytes} bytes.`)
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
    throw new Error("App source path must be a string.")
  }

  const path = normalizeAppSourcePath(value)

  if (isPlatformAppSourcePath(path)) {
    throw new Error(`App source cannot include platform-owned file: ${path}`)
  }

  return path
}

function normalizeAppSourcePath(path: string) {
  const normalized = path.trim().replaceAll("\\", "/")

  if (normalized === "") {
    throw new Error("App source paths cannot be empty.")
  }

  if (normalized.startsWith("/") || normalized.endsWith("/")) {
    throw new Error(`App source path must be relative: ${path}`)
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
    throw new Error(`App source path is not allowed: ${path}`)
  }

  if (segments.some((segment) => segment === "node_modules")) {
    throw new Error("App source cannot include node_modules.")
  }

  if (segments[0] === "dist") {
    throw new Error("App source cannot include build output.")
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
        `App source file ${file.path} uses a forbidden platform API. Use the Milo SDK instead.`
      )
    }
  }
}

// Builder and platform hash this same projection with sha256; the platform
// accepts a build only when both hashes agree.
export function appSourceHashInput(
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
