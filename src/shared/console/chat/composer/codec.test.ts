import { expect, test } from "vitest"
import { mentionNodeName } from "../../mentions/node"
import {
  createMentionCatalog,
  emptyMentionSources,
} from "../../mentions/sources"
import { parseComposerText, serializeComposerDocument } from "./codec"

const catalog = createMentionCatalog({
  ...emptyMentionSources,
  integrations: ["slack"],
  skills: ["triage"],
})

test("a message's text opens as paragraphs with its tokens as chips, and closes back to the same text", () => {
  const text =
    "Look at +[table:k17abc] and +[job:j1]\nthen /triage it via @Slack\n\n+[table:k17abc] again"
  const document = parseComposerText(text, catalog)

  expect(document.content?.map((paragraph) => paragraph.type)).toEqual([
    "paragraph",
    "paragraph",
    "paragraph",
    "paragraph",
  ])
  expect(document.content?.[0]?.content).toEqual([
    { type: "text", text: "Look at " },
    { attrs: { id: "table:k17abc", kind: "resource" }, type: mentionNodeName },
    { type: "text", text: " and " },
    { attrs: { id: "job:j1", kind: "resource" }, type: mentionNodeName },
  ])
  expect(document.content?.[2]).toEqual({ type: "paragraph" })
  expect(serializeComposerDocument(document)).toEqual({
    references: [
      { kind: "table", id: "k17abc" },
      { kind: "job", id: "j1" },
    ],
    text,
  })
})

test("hard breaks are lines, the edges are trimmed, and a broken chip is nothing", () => {
  expect(
    serializeComposerDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "  one" },
            { type: "hardBreak" },
            { type: "text", text: "two " },
            {
              attrs: { id: "video:x", kind: "resource" },
              type: mentionNodeName,
            },
            { attrs: { id: "", kind: "skill" }, type: mentionNodeName },
          ],
        },
      ],
    })
  ).toEqual({ references: [], text: "one\ntwo" })
})
