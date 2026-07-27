import { PostHogProvider } from "@posthog/react"
import { type PostHogConfig } from "posthog-js"
import { type ReactNode } from "react"

const settings: Record<string, string | undefined> = import.meta.env
const enabled = readFlag("VITE_POSTHOG_ENABLED")
const projectKey = enabled ? readSetting("VITE_POSTHOG_KEY") : undefined
const apiHost = enabled ? readSetting("VITE_POSTHOG_HOST") : undefined

if (enabled && (projectKey === undefined || apiHost === undefined)) {
  throw new Error(
    "VITE_POSTHOG_KEY and VITE_POSTHOG_HOST must be set when VITE_POSTHOG_ENABLED is true."
  )
}

/** One object for the lifetime of the page, so the provider configures the
 *  SDK once instead of on every render. */
const options: Partial<PostHogConfig> = {
  api_host: apiHost,
  // PostHog's own defaults, taken at the newest snapshot it publishes. It is
  // what makes a pageview follow a History API navigation rather than a page
  // load, and every route change here is a pushState, so without it the whole
  // site would report one pageview per visit.
  defaults: "2026-06-25",
}

/**
 * Web analytics for every page, on the one deployment that asks for it.
 *
 * Reporting is its own decision rather than a side effect of holding a token:
 * every environment builds the same code, so each one says whether it counts,
 * and only production does. Anywhere else renders no provider at all, so the
 * SDK is never initialised and nothing is sent. Development and staging
 * traffic is not usage, and counting it costs more than it tells anyone.
 *
 * The token is public by design. It only permits writes, and it ships in the
 * bundle where anyone can read it, so it names the project rather than
 * guarding it. Its host ships with it rather than falling back to the SDK's US
 * default, because each deployment reports to the PostHog cloud in its own
 * region and a default would quietly carry visitor data out of it.
 */
export function Analytics({ children }: { children: ReactNode }) {
  if (projectKey === undefined) {
    return children
  }

  return (
    <PostHogProvider apiKey={projectKey} options={options}>
      {children}
    </PostHogProvider>
  )
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
