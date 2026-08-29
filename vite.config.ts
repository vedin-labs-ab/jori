import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { configDefaults, defineConfig } from "vitest/config"

const ignoredWorkspacePaths = [
  "**/.agents/**",
  "**/.claude/**",
  "**/.trigger/**",
  "**/.tanstack/**",
  "**/dist/**",
  "**/node_modules/**",
]

// TanStack Start emits a request handler, not a server. Nitro wraps it into
// something a host can run, and picks its Vercel preset up from the build
// environment, so no target is configured here.
//
// Tests never serve requests, and leaving the server runtime installed holds
// the Vitest worker open past the last assertion, so it is left out there.
const serverPlugins = process.env.VITEST === undefined ? [nitro()] : []

const reactOrAccessibilityWarning =
  /Blocked aria-hidden|Each child in a list should have a unique|validateDOMNesting|A component is changing an? (?:un)?controlled|Cannot update a component while rendering|does not recognize the .* prop on a DOM element|Received `(?:true|false)` for a non-boolean attribute/

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
    ...serverPlugins,
    viteReact(),
  ],
  ssr: {
    // Ships files with directives that need bundling to resolve during SSR.
    noExternal: ["@convex-dev/better-auth"],
  },
  test: {
    exclude: [...configDefaults.exclude, ...ignoredWorkspacePaths],
    setupFiles: ["./test/setup.ts"],
    // Complements the wider testing-library poll deadline in test/setup.ts:
    // when full-suite runs saturate the machine, interaction-heavy jsdom
    // tests spend seconds waiting on the scheduler, and the 5s default
    // reports that starvation as a timeout. Headroom for a few polls per
    // test; a genuinely hung test still fails.
    testTimeout: 15_000,
    onConsoleLog(log, type) {
      if (type === "stderr" && reactOrAccessibilityWarning.test(log)) {
        throw new Error(`Unexpected React or accessibility warning:\n${log}`)
      }
    },
  },
})

export default config
