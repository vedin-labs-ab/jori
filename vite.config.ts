import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { configDefaults, defineConfig } from "vitest/config"
import { isRegion } from "./contracts/region"

const ignoredWorkspacePaths = [
  "**/.agents/**",
  "**/.claude/**",
  "**/.tanstack/**",
  "**/dist/**",
  "**/node_modules/**",
]

// `check:bundle` builds only to prove every import resolves the way the
// bundler resolves it — CSS, fonts, assets — so it wants the compile and
// none of the output. Nitro writes .output itself and ignores build.write,
// so the deployable artifact stays whatever the last real build left.
const bundleCheck = process.env.JORI_BUNDLE_CHECK !== undefined

// TanStack Start emits a request handler, not a server. Nitro wraps it into
// something a host can run, and picks its Vercel preset up from the build
// environment, so no target is configured here.
//
// Tests never serve requests, and leaving the server runtime installed holds
// the Vitest worker open past the last assertion, so it is left out there.
// The bundle check drops it for the same reason it drops the output: Start
// has already built both environments by the time Nitro packages them.
const serverPlugins =
  process.env.VITEST === undefined && !bundleCheck
    ? [nitro(hostingOptions())]
    : []

function hostingOptions() {
  if (process.env.VERCEL !== "1") {
    return {}
  }
  const region = process.env.VITE_JORI_REGION
  if (!isRegion(region)) {
    throw new Error("Vercel builds require VITE_JORI_REGION")
  }
  return {
    vercel: { functions: { regions: [region === "eu" ? "dub1" : "iad1"] } },
  }
}

const reactOrAccessibilityWarning =
  /Blocked aria-hidden|Each child in a list should have a unique|validateDOMNesting|A component is changing an? (?:un)?controlled|Cannot update a component while rendering|does not recognize the .* prop on a DOM element|Received `(?:true|false)` for a non-boolean attribute/

const config = defineConfig({
  build: {
    write: !bundleCheck,
  },
  server: {
    port: 8050,
    strictPort: true,
  },
  // A build inlines VITE_JORI_* at compile time, so a preview only works
  // when it is served from the origin those values name. Nitro would
  // otherwise pick its own port and every origin check would fail.
  preview: {
    port: 8050,
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
    // Dev SSR emits a route-scoped stylesheet link into the document head
    // that the client tree does not contain, so React reports a hydration
    // mismatch on every dev page load. It collects CSS imported by route
    // components, and the only stylesheet here is styles.css, linked from
    // the root route as a URL — so it has nothing to collect and turning it
    // off costs no styling while keeping the dev console honest.
    tanstackStart({ dev: { ssrStyles: { enabled: false } } }),
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
