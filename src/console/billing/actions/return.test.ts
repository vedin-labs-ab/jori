// @vitest-environment jsdom
import { expect, test } from "vitest"
import { clearBillingReturn, readBillingReturn } from "./return"

test("a return from Polar leaves nothing of it in the address", () => {
  window.history.replaceState(
    null,
    "",
    "/onboarding?billing=subscribed&customer_session_token=polar_cst_secret&tab=1"
  )

  expect(readBillingReturn()).toBe("subscribed")

  clearBillingReturn()

  // Polar's token goes with Jori's marker; what the page itself keeps in
  // the address stays.
  expect(window.location.pathname + window.location.search).toBe(
    "/onboarding?tab=1"
  )
  expect(readBillingReturn()).toBeUndefined()
})
