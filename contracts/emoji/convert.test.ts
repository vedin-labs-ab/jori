import { expect, test } from "vitest"
import { emojiForName, isEmojiText, withUnicodeEmoji } from "./convert"

test.each([
  ["wave", "👋"],
  [":wave:", "👋"],
  ["man-raising-hand", "🙋‍♂️"],
  ["+1", "👍"],
  ["thumbsup", "👍"],
  ["hooray", "🎉"],
  ["laugh", "😄"],
  ["skin-tone-2", "🏻"],
  ["WAVE", "👋"],
  ["custom_workspace_emoji", undefined],
  ["", undefined],
])("resolves emoji name %s", (input, expected) => {
  expect(emojiForName(input)).toBe(expected)
})

test.each([
  ["hello :wave: there", "hello 👋 there"],
  [":man-raising-hand:", "🙋‍♂️"],
  [":wave::skin-tone-2:", "👋🏻"],
  ["ship it :party-parrot:", "ship it :party-parrot:"],
  ["meet at 10:30:45 sharp", "meet at 10:30:45 sharp"],
  ["nice :+1: and :tada:!", "nice 👍 and 🎉!"],
  ["no shortcodes here", "no shortcodes here"],
])("converts shortcodes in %j", (input, expected) => {
  expect(withUnicodeEmoji(input)).toBe(expected)
})

test.each([
  ["🚀", true],
  ["plain text", false],
  [":wave:", false],
])("detects emoji text %j", (input, expected) => {
  expect(isEmojiText(input)).toBe(expected)
})
