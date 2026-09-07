import { expect, test } from "vitest"
import { analyticsPage, minimizeEvent } from "./privacy"

test("router definitions become fixed page categories, without dynamic IDs", () => {
  expect(analyticsPage("/")).toBe("home")
  expect(analyticsPage("/folders/$folderId/")).toBe("folders")
  expect(analyticsPage("/integrations/offers/$token")).toBe("integrations")
  expect(analyticsPage("/chat/$conversationId/")).toBe("chat")
  expect(analyticsPage("/unknown/private-text")).toBeUndefined()
  expect(analyticsPage(undefined)).toBeUndefined()
})

test("only explicit pageviews with approved categories are accepted", () => {
  expect(minimizeEvent(null)).toBeNull()
  for (const event of [
    "$autocapture",
    "$snapshot",
    "$identify",
    "$exception",
    "freeform",
  ]) {
    expect(
      minimizeEvent({ uuid: "uuid", event, properties: { page: "home" } })
    ).toBeNull()
  }
  expect(
    minimizeEvent({ uuid: "uuid", event: "$pageview", properties: {} })
  ).toBeNull()
  expect(
    minimizeEvent({
      uuid: "uuid",
      event: "$pageview",
      properties: { page: "customer-secret" },
    })
  ).toBeNull()
})

test("drops URL tokens, document content, profiles and unapproved SDK properties", () => {
  const timestamp = new Date()
  const result = minimizeEvent({
    uuid: "uuid",
    event: "$pageview",
    timestamp,
    $set: { email: "private@example.test" },
    $set_once: { name: "Customer Name" },
    properties: {
      page: "integrations",
      token: "phc_public",
      distinct_id: "anonymous-device",
      $session_id: "anonymous-session",
      $current_url:
        "https://eu.usejori.com/integrations/offers/secret?code=secret#secret",
      $referrer: "https://us.usejori.com/chat/private-conversation",
      $pathname: "/integrations/offers/private-token",
      $initial_current_url:
        "https://eu.usejori.com/?email=private@example.test",
      $elements: [{ text: "Confidential customer document" }],
      $browser: "Some future device fingerprint",
      arbitrary: { text: "Customer content" },
    },
  })
  expect(result).toEqual({
    uuid: "uuid",
    event: "$pageview",
    timestamp,
    properties: {
      page: "integrations",
      $pathname: "/integrations",
      $process_person_profile: false,
      token: "phc_public",
      distinct_id: "anonymous-device",
      $session_id: "anonymous-session",
    },
  })
})
