import { referenceKinds } from "@contracts/replies/parts"
import { expect, test } from "vitest"
import { paneBodies } from "./bodies"

test("the pane shows the four filed kinds and sends a folder or a run to its page", () => {
  const shown = referenceKinds.filter((kind) => paneBodies[kind] !== null)
  const pageOnly = referenceKinds.filter((kind) => paneBodies[kind] === null)

  expect(shown).toEqual(["file", "table", "store", "job"])
  expect(pageOnly).toEqual(["folder", "run"])
})
