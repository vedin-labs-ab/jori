import { expect, test } from "vitest"
import { type Hit } from "../../contracts/discovery"
import { rank } from "./rank"

function hit(kind: Hit["kind"], id: string, row?: string, score = 1): Hit {
  return {
    kind,
    resourceId: id,
    title: "Customer",
    resourceName: "Customer",
    snippet: "Customer record",
    candidate: {
      key: `${kind}:${id}:${row ?? score}`,
      part: 0,
      revision: "1",
      score,
    },
    location: { kind: row ? "row" : "resource", id: row ?? id },
  }
}

test("one best hit represents a file, chat, or run while distinct records remain", () => {
  const file = hit("file", "file", undefined, 2)
  const row = hit("table", "table", "a", 2)
  const hits = [
    file,
    hit("file", "file"),
    hit("run", "run"),
    hit("run", "run"),
    hit("chat", "chat"),
    hit("chat", "chat"),
    row,
    hit("table", "table", "a"),
    hit("table", "table", "b"),
    hit("store", "store", "a"),
    hit("store", "store", "b"),
  ]
  const result = rank(hits, "customer")
  expect(result).toHaveLength(7)
  expect(result).toContainEqual(file.candidate)
  expect(result).toContainEqual(row.candidate)
})
