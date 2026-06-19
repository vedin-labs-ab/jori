import { describe, expect, test } from "vitest"
import { newlyRecordedMessageId } from "./data"

describe("message record results", () => {
  test("returns newly recorded message ids", () => {
    expect(
      newlyRecordedMessageId({
        status: "recorded",
        messageId: "message-1",
      })
    ).toBe("message-1")
  })

  test("ignores duplicate message deliveries", () => {
    expect(
      newlyRecordedMessageId({
        status: "duplicate",
        messageId: "message-1",
      })
    ).toBeUndefined()
  })
})
