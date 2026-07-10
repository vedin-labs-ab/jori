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
  build: {
    rollupOptions: {
      output: {
        // Keep Clerk out of the entry chunk: it is the largest vendor, it
        // updates independently of app code, and the artifact share viewer
        // never runs it.
        manualChunks: (id) =>
          id.includes("node_modules/@clerk/") ? "clerk" : undefined,
      },
    },
  },
  test: {
    exclude: [...configDefaults.exclude, ...ignoredWorkspacePaths],
  },
})

export default config
