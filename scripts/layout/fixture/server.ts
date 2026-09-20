import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { build } from "vite"
import { serve } from "../http.ts"

const root = fileURLToPath(new URL("../../../", import.meta.url))
const origin = "http://localhost:5178"

/** Builds one of the fixture pages into a directory. */
export async function buildFixture(args: {
  page: string
  /** Where the build goes, as an absolute path. */
  outDir: string
  silent?: boolean
}) {
  await build({
    root,
    configFile: false,
    envDir: false,
    logLevel: args.silent ? "silent" : undefined,
    plugins: [tailwindcss(), react()],
    resolve: { tsconfigPaths: true },
    // What the app reads as it loads. Nothing here is ever reached.
    define: {
      "import.meta.env.VITE_JORI_REGION": JSON.stringify("us"),
      "import.meta.env.VITE_JORI_PUBLIC_ORIGIN": JSON.stringify(origin),
      "import.meta.env.VITE_JORI_US_ORIGIN": JSON.stringify(origin),
    },
    build: {
      outDir: args.outDir,
      emptyOutDir: true,
      rolldownOptions: { input: `${root}scripts/layout/${args.page}` },
    },
  })
}

export async function serveFixture(args: {
  page: string
  outDir: string
  port: number
}) {
  const outDir = `${root}${args.outDir}`

  await buildFixture({ page: args.page, outDir })
  serve(outDir, args.port)
}
