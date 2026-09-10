import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { build } from "vite"
import { serve } from "../http.ts"

const root = fileURLToPath(new URL("../../../", import.meta.url))
await build({
  root,
  configFile: false,
  envDir: false,
  plugins: [tailwindcss(), react()],
  resolve: { tsconfigPaths: true },
  define: { "import.meta.env.VITE_JORI_REGION": JSON.stringify("us") },
  build: {
    outDir: "dist/layout-chat-state",
    rolldownOptions: { input: `${root}scripts/layout/chatstate/page.html` },
  },
})
serve(`${root}dist/layout-chat-state`, Number(process.env.LAYOUT_PORT ?? 5193))
