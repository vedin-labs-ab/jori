import { describe, expect, test } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import {
  isReadableConversation,
  readWindowConversation,
  readWindowEvent,
  toAllowed,
} from "./input"

describe("effort input", () => {
  test("maps events with actor names and observedAt fallback", () => {
    const event = eventDoc({
      text: "PR merged: routing cutover",
      actor: { kind: "person", externalId: "U1", name: "Dana" },
    })

    expect(readWindowEvent(event)).toEqual({
      id: event._id,
      integrationId: event.integrationId,
      type: "pull_request.closed",
      text: "PR merged: routing cutover",
      actor: "Dana",
      observedAt: 1_000,
    })
    expect(readWindowEvent({ ...event, observedAt: 2_000 }).observedAt).toBe(
      2_000
    )
  })

  test("reads only public conversations with a summary", () => {
    const conversation = conversationDoc({})

    expect(isReadableConversation(conversation)).toBe(true)
    expect(
      isReadableConversation({ ...conversation, scope: "conversation" })
    ).toBe(false)
    expect(
      isReadableConversation({ ...conversation, summary: undefined })
    ).toBe(false)
    expect(isReadableConversation({ ...conversation, summary: "" })).toBe(false)
    expect(
      isReadableConversation({ ...conversation, summarizedAt: undefined })
    ).toBe(false)
  })

  test("maps conversations to judge shape", () => {
    const conversation = conversationDoc({})

    expect(readWindowConversation(conversation)).toEqual({
      id: conversation._id,
      integrationId: conversation.integrationId,
      summary: "#payments: cutover slipping to Jul 20",
      summarizedAt: 5_000,
    })
  })
})

describe("effort allowed set", () => {
  test("serializes the allowed set for the applier", () => {
    const event = readWindowEvent(eventDoc({}))
    const conversation = readWindowConversation(conversationDoc({}))

    expect(
      toAllowed({
        window: { start: 0, end: 1 },
        efforts: [],
        events: [event],
        conversations: [conversation],
      })
    ).toEqual({
      events: [
        { id: event.id, observedAt: 1_000, integrationId: "integration-1" },
      ],
      conversations: [
        {
          id: conversation.id,
          observedAt: 5_000,
          integrationId: "integration-1",
        },
      ],
    })
  })
})

function eventDoc(overrides: Partial<Doc<"events">>): Doc<"events"> {
  return {
    _id: "event-1",
    _creationTime: 1_000,
    tenantId: "tenant",
    integrationId: "integration-1",
    key: "key-1",
    type: "pull_request.closed",
    ...overrides,
  } as Doc<"events">
}

function conversationDoc(
  overrides: Partial<Doc<"conversations">>
): Doc<"conversations"> {
  return {
    _id: "conversation-1",
    _creationTime: 1_000,
    tenantId: "tenant",
    integrationId: "integration-1",
    externalId: "C123",
    scope: "tenant",
    summary: "#payments: cutover slipping to Jul 20",
    summarizedAt: 5_000,
    ...overrides,
  } as Doc<"conversations">
}
