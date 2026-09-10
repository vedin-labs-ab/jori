import { expect, test } from "vitest"
import { mentionNodeName } from "../../mentions/node"
import {
  createMentionCatalog,
  emptyMentionSources,
} from "../../mentions/sources"
import { parseComposerLine, serializeComposerDocument } from "./codec"

const catalog = createMentionCatalog({
  ...emptyMentionSources,
  integrations: ["slack"],
  skills: ["triage"],
})

test("parsed mention lines serialize with blank lines and deduplicated references", () => {
  const firstLine = parseComposerLine(
    "Look at +[table:k17abc] and +[job:j1]",
    catalog
  )
  const document = {
    type: "doc",
    content: [
      { type: "paragraph", content: firstLine },
      {
        type: "paragraph",
        content: parseComposerLine("then /triage it via @Slack", catalog),
      },
      { type: "paragraph" },
      {
        type: "paragraph",
        content: parseComposerLine("+[table:k17abc] again", catalog),
      },
    ],
  }

  expect(firstLine).toEqual([
    { type: "text", text: "Look at " },
    { attrs: { id: "table:k17abc", kind: "resource" }, type: mentionNodeName },
    { type: "text", text: " and " },
    { attrs: { id: "job:j1", kind: "resource" }, type: mentionNodeName },
  ])
  expect(parseComposerLine("", catalog)).toEqual([])
  expect(serializeComposerDocument(document)).toEqual({
    references: [
      { kind: "table", id: "k17abc" },
      { kind: "job", id: "j1" },
    ],
    text: "Look at +[table:k17abc] and +[job:j1]\nthen /triage it via @Slack\n\n+[table:k17abc] again",
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
