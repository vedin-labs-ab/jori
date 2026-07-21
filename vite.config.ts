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
  server: {
    port: 5173,
    strictPort: true,
  },
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
  plugins: [
    devtools({ consolePiping: { enabled: false } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  ssr: {
    // Ships files with directives that need bundling to resolve during SSR.
    noExternal: ["@convex-dev/better-auth"],
  },
  test: {
    exclude: [...configDefaults.exclude, ...ignoredWorkspacePaths],
  },
})

export default config
