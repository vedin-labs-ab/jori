import { describe, expect, test } from "vitest"
import {
  assertContractStateValue,
  normalizeArtifactContract,
} from "./contract.ts"

describe("artifact contracts", () => {
  test("normalizes Zod JSON Schema metadata into a Convex-safe contract", () => {
    const contract = normalizeArtifactContract({
      version: 1,
      state: [
        {
          name: "latest",
          key: "latest",
          scope: "shared",
          schemaName: "Latest",
          schemaVersion: 1,
          schema: {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            type: "object",
            additionalProperties: false,
            required: ["title"],
            properties: {
              title: { type: "string" },
            },
          },
        },
      ],
    })
    const entry = contract.state[0]

    expect(entry?.schema).toEqual({
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string" },
      },
    })
  })

  test("rejects non-inlined JSON Schema references", () => {
    expect(() =>
      normalizeArtifactContract({
        version: 1,
        state: [
          {
            name: "latest",
            key: "latest",
            scope: "shared",
            schemaName: "Latest",
            schemaVersion: 1,
            schema: {
              type: "object",
              $ref: "#/$defs/Latest",
            },
          },
        ],
      })
    ).toThrow("fully inlined")
  })
})

test("validates stored values against the contract schema", () => {
  const entry = contractEntry({
    type: "object",
    additionalProperties: false,
    required: ["count"],
    properties: {
      count: { type: "integer" },
    },
  })

  expect(() =>
    assertContractStateValue({ entry, value: { count: 1 } })
  ).not.toThrow()
  expect(() =>
    assertContractStateValue({ entry, value: { count: "1" } })
  ).toThrow("must be integer")
})

test("enforces string length, pattern, and UTC timestamps", () => {
  const entry = contractEntry({
    type: "object",
    additionalProperties: false,
    required: ["timestamp"],
    properties: {
      timestamp: {
        type: "string",
        minLength: 20,
        maxLength: 30,
        pattern: "Z$",
      },
    },
  })

  expect(() =>
    assertContractStateValue({
      entry,
      value: { timestamp: "2030-01-01T08:00:00Z" },
    })
  ).not.toThrow()
  expect(() =>
    assertContractStateValue({
      entry,
      value: { timestamp: "2030-01-01T08:00:00+01:00" },
    })
  ).toThrow("required pattern")
  expect(() =>
    assertContractStateValue({ entry, value: { timestamp: "short" } })
  ).toThrow("at least 20")
})

test("enforces array and numeric bounds in nested values", () => {
  const entry = contractEntry({
    type: "object",
    additionalProperties: false,
    required: ["scores"],
    properties: {
      scores: {
        type: "array",
        maxItems: 2,
        items: { type: "number", minimum: 0, maximum: 1 },
      },
    },
  })

  expect(() =>
    assertContractStateValue({ entry, value: { scores: [0, 0.5, 1] } })
  ).toThrow("at most 2")
  expect(() =>
    assertContractStateValue({ entry, value: { scores: [-0.1] } })
  ).toThrow("at least 0")
  expect(() =>
    assertContractStateValue({ entry, value: { scores: [1.1] } })
  ).toThrow("at most 1")
})

test("enforces record keys, values, and property count", () => {
  const entry = contractEntry({
    type: "object",
    additionalProperties: false,
    required: ["meetings"],
    properties: {
      meetings: {
        type: "object",
        maxProperties: 1,
        propertyNames: { type: "string", maxLength: 4 },
        additionalProperties: {
          type: "object",
          additionalProperties: false,
          required: ["revision"],
          properties: {
            revision: { type: "integer", minimum: 0 },
          },
        },
      },
    },
  })

  expect(() =>
    assertContractStateValue({
      entry,
      value: { meetings: { one: { revision: 0 } } },
    })
  ).not.toThrow()
  expect(() =>
    assertContractStateValue({
      entry,
      value: { meetings: { one: { revision: "0" } } },
    })
  ).toThrow("must be integer")
  expect(() =>
    assertContractStateValue({
      entry,
      value: { meetings: { oversized: { revision: 0 } } },
    })
  ).toThrow("at most 4")
  expect(() =>
    assertContractStateValue({
      entry,
      value: {
        meetings: { one: { revision: 0 }, two: { revision: 0 } },
      },
    })
  ).toThrow("at most 1")
})

function contractEntry(schema: Record<string, unknown>) {
  const contract = normalizeArtifactContract({
    version: 1,
    state: [
      {
        name: "latest",
        key: "latest",
        scope: "shared",
        schemaName: "Latest",
        schemaVersion: 1,
        schema,
      },
    ],
  })
  const entry = contract.state[0]

  if (entry === undefined) {
    throw new Error("Expected test contract entry.")
  }

  return entry
}
