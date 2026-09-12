import { expect, test } from "vitest"
import { analyticsConfig } from "./config"

const settings = {
  VITE_POSTHOG_ENABLED: "true",
  VITE_POSTHOG_KEY: "phc_test",
  VITE_POSTHOG_HOST: "https://eu.i.posthog.com",
}

test.each(["eu", "us"] as const)(
  "%s analytics has a regional API and host-only identity",
  (region) => {
    expect(
      analyticsConfig(
        { ...settings, VITE_POSTHOG_HOST: `https://${region}.i.posthog.com` },
        region
      )
    ).toMatchObject({
      key: "phc_test",
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
)

test("crossed regions, default hosts and private keys fail closed", () => {
  expect(() => analyticsConfig(settings, "us")).toThrow("regional PostHog host")
  for (const host of [
    "https://app.posthog.com",
    "https://posthog.com",
    "https://eu.i.posthog.com.evil.test",
  ]) {
    expect(() =>
      analyticsConfig({ ...settings, VITE_POSTHOG_HOST: host }, "eu")
    ).toThrow("regional PostHog host")
  }
  expect(() =>
    analyticsConfig({ ...settings, VITE_POSTHOG_KEY: "phx_private" }, "eu")
  ).toThrow("public PostHog project token")
})

test("analytics stays off unless explicitly enabled with complete settings", () => {
  expect(analyticsConfig({}, "eu")).toBeUndefined()
  expect(
    analyticsConfig({ ...settings, VITE_POSTHOG_ENABLED: "false" }, "us")
  ).toBeUndefined()
  expect(() => analyticsConfig({ VITE_POSTHOG_ENABLED: "true" }, "eu")).toThrow(
    "requires"
  )
  expect(() =>
    analyticsConfig({ ...settings, VITE_POSTHOG_ENABLED: "1" }, "eu")
  ).toThrow("true or false")
})
