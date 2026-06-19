import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { configDefaults, defineConfig } from "vitest/config"

const ignoredWorkspacePaths = [
  "**/.agents/**",
  "**/.claude/**",
  "**/.trigger/**",
  "**/.tanstack/**",
  "**/dist/**",
  "**/node_modules/**",
  "**/runtime/source/artifact/template/**",
]

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  test: {
    exclude: [...configDefaults.exclude, ...ignoredWorkspacePaths],
  },
})

export default config
