import { PostHogProvider } from "@posthog/react"
import { type PostHogConfig } from "posthog-js"
import { type ReactNode } from "react"

const environment: Record<string, string | undefined> = import.meta.env
const projectKey = readSetting("VITE_POSTHOG_KEY")
const apiHost = readSetting("VITE_POSTHOG_HOST")

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
 * Web analytics for every page, reported to the deployment's own PostHog
 * project.
 *
 * The project token is public by design — it only permits writes — so it ships
 * in the bundle like any other client setting. Its host ships with it rather
 * than falling back to the SDK's US default, because each deployment reports
 * to the PostHog cloud in its own region and a default would quietly carry
 * visitor data out of it.
 *
 * A deployment with no token, which is every local checkout, renders no
 * provider at all. Development traffic is not usage, and counting it costs
 * more than it tells anyone.
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
  const value = environment[name]?.trim()

  return value === undefined || value === "" ? undefined : value
}
