// @vitest-environment jsdom
import { beforeEach, expect, test } from "vitest"
import {
  clearOAuthFeedback,
  readOAuthFeedback,
  signInErrorCallbackURL,
} from "./oauth"

beforeEach(() => {
  window.history.replaceState({}, "", "/jobs?page=2")
})

test("keeps social sign-in failures inside Jori", () => {
  const errorURL = new URL(signInErrorCallbackURL("google"))

  expect(errorURL.pathname).toBe("/jobs")
  expect(errorURL.searchParams.get("authProvider")).toBe("google")
})

test("explains that provider identities are distinct", () => {
  const feedback = readOAuthFeedback({
    url: new URL(
      "https://jori.test/sign-in?authProvider=microsoft&error=account_not_linked"
    ),
  })

  expect(feedback).toEqual({
    message:
      "This Jori account does not use Microsoft sign-in. Use the provider you originally chose.",
  })
})

test("cleans consumed callback state without losing page search", () => {
  window.history.replaceState(
    {},
    "",
    "/jobs?page=2&authProvider=google&error=access_denied"
  )

  clearOAuthFeedback()

  const url = new URL(window.location.href)
  expect(url.searchParams.get("page")).toBe("2")
  expect(url.searchParams.has("authProvider")).toBe(false)
  expect(url.searchParams.has("error")).toBe(false)
})
