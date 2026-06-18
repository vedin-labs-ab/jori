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

describe("artifact contract state values", () => {
  test("validates stored values against the contract schema", () => {
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
            type: "object",
            additionalProperties: false,
            required: ["count"],
            properties: {
              count: { type: "integer" },
            },
          },
        },
      ],
    })
    const entry = contract.state[0]

    if (entry === undefined) {
      throw new Error("Expected test contract entry.")
    }

    expect(() =>
      assertContractStateValue({ entry, value: { count: 1 } })
    ).not.toThrow()
    expect(() =>
      assertContractStateValue({ entry, value: { count: "1" } })
    ).toThrow("must be integer")
  })
})
