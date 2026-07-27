import { isEnvironment } from "@contracts/environment"
import { PostHogProvider } from "@posthog/react"
import { type PostHogConfig } from "posthog-js"
import { type ReactNode } from "react"

const settings: Record<string, string | undefined> = import.meta.env
const deployment = readSetting("VITE_JORI_ENVIRONMENT")

if (deployment !== undefined && !isEnvironment(deployment)) {
  throw new Error(
    `VITE_JORI_ENVIRONMENT must name an environment, received ${JSON.stringify(deployment)}.`
  )
}

/** Only production reports. Development and staging run the same build from
 *  the same code, so the environment has to say which one is live — an unset
 *  key would only mean "nobody configured this yet", which is exactly the
 *  mistake that puts a laptop's traffic in the numbers. */
const reports = deployment === "prod"
const projectKey = reports ? readSetting("VITE_POSTHOG_KEY") : undefined
const apiHost = reports ? readSetting("VITE_POSTHOG_HOST") : undefined

if (projectKey !== undefined && apiHost === undefined) {
  throw new Error("VITE_POSTHOG_HOST must be set alongside VITE_POSTHOG_KEY.")
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
 * Web analytics for every page of the production site, and only that one.
 *
 * The project token is public by design — it only permits writes — so it ships
 * in the bundle like any other client setting. Its host ships with it rather
 * than falling back to the SDK's US default, because each deployment reports
 * to the PostHog cloud in its own region and a default would quietly carry
 * visitor data out of it.
 *
 * Everywhere else renders no provider at all, so the SDK is never initialised
 * and nothing is sent. Development and staging traffic is not usage, and
 * counting it costs more than it tells anyone.
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

function readSetting(name: string) {
  const value = settings[name]?.trim()

  return value === undefined || value === "" ? undefined : value
}
