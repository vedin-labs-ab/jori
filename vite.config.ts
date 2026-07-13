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
  "**/runtime/artifacts/template/**",
]

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    // These packages coordinate through module-level state (React context,
    // Radix dismissable-layer stacks), so every import — nested, prebundled,
    // or from a stale optimizer graph — must resolve to one instance. Two
    // copies of the dismissable layer split the dismiss stack: closing a
    // dropdown then also closes the dialog under it.
    dedupe: [
      "react",
      "react-dom",
      "radix-ui",
      "@radix-ui/react-dismissable-layer",
      "@base-ui/react",
    ],
  },
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
