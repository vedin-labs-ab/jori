import { expect, test } from "vitest"
import { type SourceSnapshot, sourcesEqual } from "./sources"

// sourcesEqual guards `propose`: when it reports equality (and the facts and
// website match), no proposal is written. Hash drift must not count as a
// change — otherwise every cosmetic page edit would keep resurrecting
// dismissed proposals and re-running drafts on each watcher sweep.

const approved: SourceSnapshot[] = [
  { url: "https://acme.com", primary: true, hash: "aaa" },
  { url: "https://acme.com/about", primary: false, hash: "bbb" },
]

test("hash-only drift is not a source change", () => {
  const recrawled = approved.map((source) => ({
    ...source,
    hash: `${source.hash}-changed`,
  }))

  expect(sourcesEqual(approved, recrawled)).toBe(true)
})

test("membership changes are source changes", () => {
  const grown = [
    ...approved,
    { url: "https://acme.com/team", primary: false, hash: "ccc" },
  ]

  expect(sourcesEqual(approved, grown)).toBe(false)
})

test("moving the primary flag is a source change", () => {
  const moved = approved.map((source) => ({
    ...source,
    primary: !source.primary,
  }))

  expect(sourcesEqual(approved, moved)).toBe(false)
})

test("url casing, padding, and missing hashes do not count", () => {
  const restated = [
    { url: " https://ACME.com ", primary: true },
    { url: "https://acme.com/About", primary: false },
  ]

  expect(sourcesEqual(approved, restated)).toBe(true)
})

test("duplicate urls collapse before comparison", () => {
  const doubled = [
    ...approved,
    { url: "HTTPS://acme.com", primary: true, hash: "zzz" },
  ]

  expect(sourcesEqual(approved, doubled)).toBe(true)
})
