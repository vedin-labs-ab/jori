import { expect, test } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type Projection } from "../source/types"
import { prepare } from "./prepare"

test("editing and moving sections keeps unchanged chunk identities, distinguishes duplicates, and isolates sources", async () => {
  const ctx = {} as ActionCtx
  const state = { key: "files:one" } as Doc<"discoverySources">
  const source = {
    title: "Operations",
    resourceName: "Operations",
    revision: "one",
    resourceKey: state.key,
    kind: "file",
    gate: { visibility: { mode: "organization" } },
    sections: ["First", "Second", "First"].map((text, index) => ({
      text,
      location: { kind: "passage", id: String(index) },
    })),
  } as Projection
  const first = await prepare(ctx, state, source)
  const changed = await prepare(ctx, state, {
    ...source,
    revision: "two",
    sections: [
      source.sections[1],
      { text: "Changed", location: { kind: "passage", id: "new" } },
      source.sections[0],
      source.sections[2],
    ],
  })
  expect(new Set(first.rows.map((row) => row.id)).size).toBe(3)
  expect(changed.rows[0].id).toBe(first.rows[1].id)
  expect(changed.rows[2].id).toBe(first.rows[0].id)
  expect(changed.rows[3].id).toBe(first.rows[2].id)
  expect(changed.rows[2]).toMatchObject({ part: 2, revision: "two" })
  const isolated = await prepare(ctx, { ...state, key: "files:other" }, source)
  expect(
    isolated.rows
      .map((row) => row.id)
      .some((id) => first.rows.some((row) => row.id === id))
  ).toBe(false)
})
