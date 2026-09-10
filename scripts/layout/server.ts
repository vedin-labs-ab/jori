import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { build, type InlineConfig } from "vite"
import { serve } from "./http.ts"

const root = fileURLToPath(new URL("../../", import.meta.url))
const config = {
  root,
  configFile: false,
  envDir: false,
  plugins: [tailwindcss(), react()],
  resolve: { tsconfigPaths: true },
  define: {
    "import.meta.env.VITE_JORI_REGION": JSON.stringify("us"),
    "import.meta.env.VITE_JORI_PUBLIC_ORIGIN": JSON.stringify(
      "http://localhost:5178"
    ),
    "import.meta.env.VITE_JORI_US_ORIGIN": JSON.stringify(
      "http://localhost:5178"
    ),
  },
  build: {
    outDir: "dist/layout",
    rolldownOptions: { input: `${root}scripts/layout/page.html` },
  },
} satisfies InlineConfig
await build(config)
const port = Number(process.env.LAYOUT_PORT ?? 5180)
serve(`${root}dist/layout`, port)
process.stdout.write(
  `Layout fixture: http://127.0.0.1:${port}/scripts/layout/page.html\n`
)
