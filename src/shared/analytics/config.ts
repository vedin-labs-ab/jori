import { type Region } from "@contracts/region"
import { minimizeEvent } from "./privacy"

type Environment = Record<string, string | boolean | undefined>

/** Each deployment chooses one destination, with no default US endpoint. */
export function analyticsConfig(environment: Environment, region: Region) {
  const enabled = setting(environment, "VITE_POSTHOG_ENABLED")
  if (enabled !== undefined && enabled !== "true" && enabled !== "false") {
    throw new Error("VITE_POSTHOG_ENABLED must be true or false.")
  }
  if (enabled !== "true") {
    return undefined
  }
  const key = setting(environment, "VITE_POSTHOG_KEY")
  const host = setting(environment, "VITE_POSTHOG_HOST")
  if (key === undefined || host === undefined) {
    throw new Error(
      "Enabled analytics requires VITE_POSTHOG_KEY and VITE_POSTHOG_HOST."
    )
  }
  if (!key.startsWith("phc_")) {
    throw new Error(
      "Browser analytics requires a public PostHog project token."
    )
  }
  if (host !== `https://${region}.i.posthog.com`) {
    throw new Error("Analytics must use this instance's regional PostHog host.")
  }
  return {
    key,
    options: analyticsOptions(host, region),
  }
}

function analyticsOptions(host: string, region: Region) {
  return {
    api_host: host,
    ui_host: `https://${region}.posthog.com`,
    cross_subdomain_cookie: false,
    defaults: "2026-06-25",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_dead_clicks: false,
    capture_performance: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    person_profiles: "never",
    save_referrer: false,
    save_campaign_params: false,
    disable_capture_url_hashes: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    respect_dnt: true,
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    cookie_expiration: 180,
    before_send: minimizeEvent,
  } satisfies Partial<import("posthog-js").PostHogConfig>
}

function setting(environment: Environment, name: string) {
  const value = environment[name]
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}
