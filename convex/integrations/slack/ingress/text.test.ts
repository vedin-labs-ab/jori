import { expect, test } from "vitest"
import {
  humanizeSlackText,
  slackTextMentionsUser,
  unlabeledSlackChannelIds,
  unlabeledSlackUserIds,
} from "./text"

const entities = {
  channels: new Map([["C042ABC", "social"]]),
  users: new Map([
    ["U0B96KZ7WJG", "Jori"],
    ["U777", "Albin Vedin"],
  ]),
}

test.each([
  ["<@U0B96KZ7WJG> :man-raising-hand:", "@Jori 🙋‍♂️"],
  ["<@U0B96KZ7WJG|jori> hello", "@Jori hello"],
  ["ask <@U777> about it", "ask @Albin Vedin about it"],
  ["ping <@U999>", "ping @U999"],
  ["ping <@U999|dave>", "ping @dave"],
  ["see <#C042ABC>", "see #social"],
  ["see <#C042ABC|social>", "see #social"],
  ["see <#C555|random>", "see #random"],
  ["<!here> quick question", "@here quick question"],
  ["<!channel|channel> heads up", "@channel heads up"],
  ["<!everyone> hi", "@everyone hi"],
  ["cc <!subteam^S123|@eng>", "cc @eng"],
  ["cc <!subteam^S123>", "cc @S123"],
  [
    "docs at <https://example.com|the docs>",
    "docs at the docs (https://example.com)",
  ],
  ["see <https://example.com>", "see https://example.com"],
  ["see <https://example.com|https://example.com>", "see https://example.com"],
  ["mail <mailto:a@b.com|a@b.com>", "mail a@b.com"],
  ["mail <mailto:a@b.com|Albin>", "mail Albin (a@b.com)"],
  ["due <!date^1699999999^{date_short}|Nov 14, 2023>", "due Nov 14, 2023"],
  ["a &amp; b &lt;ok&gt;", "a & b <ok>"],
  ["nice :tada: work :party-parrot:", "nice 🎉 work :party-parrot:"],
  ["wave :wave::skin-tone-2:", "wave 👋🏻"],
  ["plain text stays", "plain text stays"],
])("humanizes %j", (input, expected) => {
  expect(humanizeSlackText(input, entities)).toBe(expected)
})

test("collects unlabeled user ids once", () => {
  expect(unlabeledSlackUserIds("<@U1> <@U1> <@U2|dave> <@W3> <#C1>")).toEqual([
    "U1",
    "W3",
  ])
})

test("collects unlabeled channel ids", () => {
  expect(unlabeledSlackChannelIds("<#C1> <#C2|general> <@U1>")).toEqual(["C1"])
})

test.each([
  ["<@U0B96KZ7WJG> hi", true],
  ["<@U0B96KZ7WJG|jori> hi", true],
  ["<@U777> hi", false],
  ["plain", false],
])("detects self mention in %j", (text, expected) => {
  expect(slackTextMentionsUser(text, "U0B96KZ7WJG")).toBe(expected)
})
