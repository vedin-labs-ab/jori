import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { build } from "vite"
import { serve } from "../http.ts"

const root = fileURLToPath(new URL("../../../", import.meta.url))

export async function serveFixture(args: {
  page: string
  outDir: string
  port: number
  define?: Record<string, string>
}) {
  await build({
    root,
    configFile: false,
    envDir: false,
    plugins: [tailwindcss(), react()],
    resolve: { tsconfigPaths: true },
    define: {
      "import.meta.env.VITE_JORI_REGION": JSON.stringify("us"),
      ...args.define,
    },
    build: {
      outDir: args.outDir,
      rolldownOptions: { input: `${root}scripts/layout/${args.page}` },
    },
  })
  serve(`${root}${args.outDir}`, args.port)
}
