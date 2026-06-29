import { expect, test } from "vitest"
import { reactionDisplayLabel } from "./display"

test.each([
  ["thumbsup", "👍"],
  [":thumbsup:", "👍"],
  ["white_check_mark", "✅"],
  ["+1", "👍"],
  ["laugh", "😄"],
  ["hooray", "🎉"],
  ["🚀", "🚀"],
  ["custom_workspace_emoji", ":custom_workspace_emoji:"],
])("formats reaction label %s", (input, expected) => {
  expect(reactionDisplayLabel(input)).toBe(expected)
})
