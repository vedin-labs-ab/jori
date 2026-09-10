import { type GenericId } from "convex/values"
import { expect, test } from "vitest"
import { type MessageRow, toChatMessage } from "./messages"

function row(
  overrides: Omit<Partial<MessageRow>, "id"> & { id: string }
): MessageRow {
  return {
    role: "jori",
    text: "",
    data: undefined,
    createdAt: 1_000,
    ...overrides,
    id: overrides.id as GenericId<"messages">,
  }
}

test("a person's message carries its context and answer, and no parts", () => {
  expect(
    toChatMessage(
      row({
        id: "messages:1",
        role: "person",
        author: {
          id: "maya" as GenericId<"persons">,
          name: "Maya Lund",
          image: undefined,
          isViewer: false,
        },
        text: "Yes, post it",
        data: {
          context: { kind: "folder", id: "folders:7" },
          answer: {
            messageId: "messages:0",
            answers: [{ part: 0, values: ["post"] }],
          },
        },
      })
    )
  ).toEqual({
    id: "messages:1",
    role: "person",
    author: {
      id: "maya" as GenericId<"persons">,
      name: "Maya Lund",
      image: undefined,
      isViewer: false,
    },
    text: "Yes, post it",
    parts: [],
    context: { kind: "folder", id: "folders:7" },
    answer: {
      messageId: "messages:0",
      answers: [{ part: 0, values: ["post"] }],
    },
    createdAt: 1_000,
  })
})

test("a reply's parts are read from its data; anything malformed reads as none", () => {
  const parts = [
    { kind: "reference", target: { kind: "table", id: "collections:1" } },
    { kind: "choices", options: [{ label: "Open it" }] },
  ]

  expect(
    toChatMessage(row({ id: "messages:2", text: "Done.", data: { parts } }))
  ).toEqual({
    id: "messages:2",
    role: "jori",
    text: "Done.",
    parts,
    createdAt: 1_000,
  })
  expect(
    toChatMessage(
      row({ id: "messages:3", data: { parts: [{ kind: "video" }] } })
    ).parts
  ).toEqual([])
  expect(toChatMessage(row({ id: "messages:4" }))).not.toHaveProperty("context")
})
