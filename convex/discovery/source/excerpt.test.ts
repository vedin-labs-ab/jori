import { expect, test } from "vitest"
import { excerpt } from "./excerpt"

test("short sentences keep their meaning and original match offsets", () => {
  const text =
    "Deployment never leaves the region. Who can read customer data? Only the account owner."
  const result = excerpt(text, "customer")
  expect(result.snippet).toBe("…Who can read customer data?…")
  expect(text.slice(result.focus?.start, result.focus?.end)).toBe("customer")
})

test("long passages keep whole words around the match within a compact window", () => {
  const text =
    "Before this point we explain the process in detail and provide a lengthy introduction to the policy for customer retention and storage across the company with many more explanatory words following it"
  const result = excerpt(text, "customer")
  expect(result.snippet.length).toBeLessThanOrEqual(122)
  expect(result.snippet).toContain("for customer retention")
  expect(result.snippet).not.toMatch(/^…\S*Before/)
})

test("a later cluster beats an isolated query term, even after many occurrences", () => {
  const text = `${"Customer details elsewhere. ".repeat(40)}Customer data requires explicit approval.`
  const result = excerpt(text, "customer approval")
  expect(result.snippet).toBe("…Customer data requires explicit approval.")
  expect(text.slice(result.focus?.start, result.focus?.end)).toBe(
    "Customer data requires explicit approval"
  )
})

test("full phrases win and punctuation and Unicode keep exact UTF-16 offsets", () => {
  const text = "Customer data elsewhere. 🐈 C++ customer approval is required."
  for (const query of ["customer approval", "C++", "🐈"]) {
    const result = excerpt(text, query)
    expect(text.slice(result.focus?.start, result.focus?.end)).toBe(query)
    expect(result.snippet).toContain(query)
  }
})

test("semantic matches use a short opening without fabricating a literal focus", () => {
  expect(
    excerpt("Supplier contracts. Unrelated next sentence.", "vendor agreements")
  ).toEqual({ snippet: "Supplier contracts.…", focus: undefined })
})

test("a long exact phrase is preserved instead of being cut in half", () => {
  const query = "long phrase ".repeat(15).trim()
  expect(excerpt(`Intro. ${query}. End.`, query).snippet).toContain(query)
})
