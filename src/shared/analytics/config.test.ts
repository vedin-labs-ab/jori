import { expect, test } from "vitest"
import { analyticsConfig } from "./config"

const settings = {
  VITE_POSTHOG_ENABLED: "true",
  VITE_POSTHOG_EU_KEY: "phc_eu",
  VITE_POSTHOG_US_KEY: "phc_us",
}

test("each enabled region gets its own instance at its own host, with host-only identity", () => {
  const instances = analyticsConfig(settings, ["eu", "us"])
  for (const region of ["eu", "us"] as const) {
    expect(instances?.[region]).toMatchObject({
      key: `phc_${region}`,
      options: {
        api_host: `https://${region}.i.posthog.com`,
        ui_host: `https://${region}.posthog.com`,
        cross_subdomain_cookie: false,
        defaults: "2026-06-25",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        opt_out_capturing_by_default: true,
        opt_out_persistence_by_default: true,
        disable_session_recording: true,
        disable_external_dependency_loading: true,
        person_profiles: "never",
        save_referrer: false,
        save_campaign_params: false,
      },
    })
  }
  expect(analyticsConfig(settings, ["us"])?.eu).toBeUndefined()
})

test("a missing or private key for an enabled region fails closed", () => {
  expect(() =>
    analyticsConfig({ ...settings, VITE_POSTHOG_EU_KEY: "" }, ["eu", "us"])
  ).toThrow("VITE_POSTHOG_EU_KEY")
  expect(() =>
    analyticsConfig({ ...settings, VITE_POSTHOG_EU_KEY: "phx_private" }, ["eu"])
  ).toThrow("public PostHog project token")
})

test("analytics stays off unless explicitly enabled", () => {
  expect(analyticsConfig({}, ["eu"])).toBeUndefined()
  expect(
    analyticsConfig({ ...settings, VITE_POSTHOG_ENABLED: "false" }, ["us"])
  ).toBeUndefined()
  expect(() =>
    analyticsConfig({ ...settings, VITE_POSTHOG_ENABLED: "1" }, ["eu"])
  ).toThrow("true or false")
})
