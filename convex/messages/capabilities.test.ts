import { expect, test } from "vitest"
import {
  communicationCapabilities,
  communicationGuidance,
  replyPartKinds,
} from "./capabilities"

test("the console reply embeds references and choices; providers embed nothing", () => {
  expect(replyPartKinds("console")).toEqual(["reference", "choices"])
  expect(replyPartKinds("slack")).toEqual([])
  expect(replyPartKinds("github")).toEqual([])
  expect(replyPartKinds("linear")).toEqual([])
})

test("Slack's rich capability is Block Kit, not an embedded part", () => {
  expect(communicationCapabilities("slack")).toEqual(["text", "blocks"])
})

test("guidance follows the capabilities, each part once", () => {
  expect(communicationGuidance("console")).toEqual([
    "text",
    "rich",
    "interactive",
  ])
  expect(communicationGuidance("slack")).toEqual(["text", "rich"])
  expect(communicationGuidance("github")).toEqual(["text"])
})
