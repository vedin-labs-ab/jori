import { expect, test } from "vitest"
import { contractProperties, type Kind } from "./events"

const contracts: Record<string, Record<string, Kind>> = {
  "job created": {
    trigger: ["schedule", "mention"],
    shared: "boolean",
    steps: "number",
    organization: "id",
  },
}

test("an event keeps only its contract's properties", () => {
  expect(
    contractProperties(
      "job created",
      {
        trigger: "schedule",
        shared: false,
        steps: 3,
        organization: "k57abc_DEF-123",
        instructions: "Email the quarterly numbers to the board",
      },
      contracts
    )
  ).toEqual({
    trigger: "schedule",
    shared: false,
    steps: 3,
    organization: "k57abc_DEF-123",
  })
})

test("free text, a wrong kind or a missing property drops the whole event", () => {
  const valid = {
    trigger: "mention",
    shared: true,
    steps: 1,
    organization: "k57abc",
  }
  for (const properties of [
    { ...valid, trigger: "Email the board" },
    { ...valid, organization: "Acme Holdings AB" },
    { ...valid, organization: "person@example.test" },
    { ...valid, shared: "true" },
    { ...valid, steps: Number.NaN },
    { ...valid, steps: "3" },
    { trigger: "mention" },
    undefined,
  ]) {
    expect(
      contractProperties("job created", properties, contracts)
    ).toBeUndefined()
  }
})

test("an event outside the contract is dropped, inherited names included", () => {
  expect(contractProperties("job deleted", {}, contracts)).toBeUndefined()
  expect(contractProperties("toString", {}, contracts)).toBeUndefined()
  expect(contractProperties("$autocapture", { page: "home" })).toBeUndefined()
})
