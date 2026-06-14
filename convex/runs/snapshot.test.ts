import { describe, expect, test } from "vitest"
import {
  createAutomationRunSnapshot,
  createMessageRunSnapshot,
} from "./snapshot"

describe("run snapshots", () => {
  test("stores automation names and tasks directly", () => {
    expect(
      createAutomationRunSnapshot({
        name: "Daily digest",
        instructions: "Summarize Slack and send the digest.",
      })
    ).toEqual({
      title: "Daily digest",
      task: "Summarize Slack and send the digest.",
    })
  })

  test("uses the first meaningful message line as the title", () => {
    expect(
      createMessageRunSnapshot({
        text: "\nPlease summarize this thread.\n\nFocus on open decisions.",
      })
    ).toEqual({
      title: "Please summarize this thread.",
      task: "Please summarize this thread.\n\nFocus on open decisions.",
    })
  })

  test("rejects empty run tasks", () => {
    expect(() => createMessageRunSnapshot({ text: "   " })).toThrow(
      "Run task cannot be empty."
    )
  })
})
