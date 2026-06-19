import { describe, expect, test } from "vitest"
import { readNewlyRecordedMessageId } from "./http"

describe("Slack event routing gate", () => {
  test("routes only newly recorded Slack messages", () => {
    expect(
      readNewlyRecordedMessageId({
        status: "recorded",
        messageId: "message-1",
      })
    ).toBe("message-1")
  })

  test("does not route duplicate Slack deliveries", () => {
    expect(
      readNewlyRecordedMessageId({
        status: "duplicate",
        messageId: "message-1",
      })
    ).toBeUndefined()
  })
})
