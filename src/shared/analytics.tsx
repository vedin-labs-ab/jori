import { type ReactNode, useEffect } from "react"

const settings: Record<string, string | undefined> = import.meta.env
const enabled = readFlag("VITE_POSTHOG_ENABLED")
const projectKey = enabled ? readSetting("VITE_POSTHOG_KEY") : undefined
const apiHost = enabled ? readSetting("VITE_POSTHOG_HOST") : undefined

if (enabled && (projectKey === undefined || apiHost === undefined)) {
  throw new Error(
    "VITE_POSTHOG_KEY and VITE_POSTHOG_HOST must be set when VITE_POSTHOG_ENABLED is true."
  )
}

/** One object for the lifetime of the page, so the SDK configures once
 *  instead of on every render. The type arrives through `import()` rather
 *  than an import statement, because `verbatimModuleSyntax` keeps even a
 *  type-only statement as a runtime import of the module, and pulling the
 *  SDK into the entry chunk is exactly what this file avoids. */
const options: Partial<import("posthog-js").PostHogConfig> = {
  api_host: apiHost,
  // PostHog's own defaults, taken at the newest snapshot it publishes. It is
  // what makes a pageview follow a History API navigation rather than a page
  // load, and every route change here is a pushState, so without it the whole
  // site would report one pageview per visit.
  defaults: "2026-06-25",
}

/** The effect below runs once per mount of the root, and React mounts twice
 *  in development strict mode, so the guard lives at module scope where a
 *  remount cannot reset it. */
let initialized = false

/**
 * Web analytics for every page, on the one deployment that asks for it.
 *
 * Reporting is its own decision rather than a side effect of holding a token:
 * every environment builds the same code, so each one says whether it counts,
 * and only production does. Anywhere else the SDK is never loaded and nothing
 * is sent. Development and staging traffic is not usage, and counting it
 * costs more than it tells anyone.
 *
 * The SDK arrives through a dynamic import after hydration rather than a
 * static one, because a static import makes it the heaviest module in the
 * entry chunk, paid on every page before the app is interactive. Nothing
 * renders analytics state, so nothing needs it before this effect runs, and
 * a pageview captured moments after load is the same pageview.
 *
 * The token is public by design. It only permits writes, and it ships in the
 * bundle where anyone can read it, so it names the project rather than
 * guarding it. Its host ships with it rather than falling back to the SDK's US
 * default, because each deployment reports to the PostHog cloud in its own
 * region and a default would quietly carry visitor data out of it.
 */
export function Analytics({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (projectKey === undefined || initialized) {
      return
    }

    initialized = true
    void import("posthog-js").then(({ default: posthog }) => {
      posthog.init(projectKey, options)
    })
  }, [])

  return children
}

/** Off unless a deployment says otherwise, and loud about anything that is
 *  neither, so a value like `1` cannot read as enabled to a person while the
 *  site treats it as disabled. */
function readFlag(name: string) {
  const value = readSetting(name)

  if (value !== undefined && value !== "true" && value !== "false") {
    throw new Error(
      `${name} must be true or false, received ${JSON.stringify(value)}.`
    )
  }

  return value === "true"
}

function readSetting(name: string) {
  const value = settings[name]?.trim()

  return value === undefined || value === "" ? undefined : value
}
