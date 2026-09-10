import { spawn, spawnSync } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { createServer } from "vite"
import { loadTarget } from "../env/target.ts"

const env = loadTarget("dev")
if (!env.CONVEX_DEPLOYMENT?.startsWith("dev:")) {
  throw new Error(
    "Layout authentication capture requires a development deployment"
  )
}
Object.assign(process.env, env, {
  VITE_JORI_PUBLIC_ORIGIN: "http://localhost:5178",
  VITE_JORI_US_ORIGIN: "http://localhost:5178",
  VITE_JORI_US_SITE_URL: env.VITE_CONVEX_SITE_URL,
})
const session = path.resolve("scripts/layout/reports/session.local")
if (process.argv.includes("--build")) {
  const result = spawnSync("pnpm", ["build"], {
    env: process.env,
    stdio: "inherit",
  })
  if (result.status !== 0) {
    throw new Error("Layout app build failed")
  }
  const child = spawn(process.execPath, [".output/server/index.mjs"], {
    env: { ...process.env, PORT: "5178", HOST: "localhost" },
    stdio: "inherit",
  })
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      child.kill(signal)
    })
  }
  child.on("exit", (code) => {
    process.exitCode = code ?? 1
  })
} else {
  const server = await createServer({
    server: { host: "localhost", port: 5178, strictPort: true },
    plugins: [
      {
        name: "layout-session",
        configureServer(vite) {
          vite.middlewares.use("/__layout/session", (request, response) => {
            void saveSession(request.headers.cookie ?? "")
              .then(() => {
                response.setHeader("Content-Type", "text/plain")
                response.end(
                  "Local Chromium testing session saved. You can return to Jori."
                )
              })
              .catch(() => {
                response.statusCode = 401
                response.end("Sign in to localhost:5173 first")
              })
          })
        },
      },
    ],
  })
  await server.listen()
  process.stdout.write("Layout app: http://localhost:5178\n")
}

async function saveSession(header: string) {
  const cookies = header.split("; ").flatMap((entry) => {
    const index = entry.indexOf("=")
    const name = entry.slice(0, index)
    if (!name.includes("better-auth")) {
      return []
    }
    return [
      {
        name,
        value: entry.slice(index + 1),
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]
  })
  if (cookies.length === 0) {
    throw new Error("Sign in to localhost:5173 first")
  }
  await mkdir(path.dirname(session), { recursive: true })
  await writeFile(session, JSON.stringify({ cookies, origins: [] }), {
    mode: 0o600,
  })
}
