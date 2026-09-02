import { expect, test } from "vitest"
import { createJobMentionCatalog } from "../../../access"
import {
  createJobInstructionDocument,
  serializeJobInstructionDocument,
} from "../document"
import { readInstructionReferences } from "./references"

const catalog = createJobMentionCatalog({
  skills: ["meeting-prep"],
  tools: ["save_file"],
})

test("round-trips the supported Markdown profile", () => {
  const source = [
    "# Daily brief",
    "",
    "Use **clear prose**, [source links](https://example.com), and `code`.",
    "",
    "- First",
    "- Second",
    "",
    "> Keep it concise.",
    "",
    "```json",
    '{"enabled": true}',
    "```",
  ].join("\n")

  expect(roundTrip(roundTrip(source))).toBe(roundTrip(source))
})

test.each([
  "",
  "txt",
  "text",
  "plaintext",
  "TeXt",
  "PLAINTEXT",
])("treats the %s fence as canonical plain text", (language) => {
  const document = parse(
    [`\`\`\`${language}`, "Use #save_file.", "```"].join("\n")
  )

  expect(document.content?.[0]?.type).toBe("fencedText")
  expect(readInstructionReferences(document)).toEqual([
    { id: "save_file", kind: "tool" },
  ])
  expect(serialize(document).description).toBe(
    ["```txt", "Use #save_file.", "```"].join("\n")
  )
})

test.each([
  "json",
  "instructions",
  "javascript",
])("keeps the %s fence literal and inert", (language) => {
  const source = [`\`\`\`${language}`, 'Use "#save_file".', "```"].join("\n")
  const document = parse(source)

  expect(document.content?.[0]?.type).toBe("codeBlock")
  expect(readInstructionReferences(document)).toEqual([])
  expect(serialize(document).description).toBe(source)
})

test("distinguishes headings from tool references", () => {
  const document = parse("# Heading\n\n#save_file")

  expect(document.content?.map((node) => node.type)).toEqual([
    "heading",
    "paragraph",
  ])
  expect(readInstructionReferences(document)).toEqual([
    { id: "save_file", kind: "tool" },
  ])
})

test("only hydrates inline-code references after whitespace", () => {
  const document = parse("`#save_file` and `Use #save_file for the result`.")

  expect(readInstructionReferences(document)).toEqual([
    { id: "save_file", kind: "tool" },
  ])
  expect(serialize(document).description).toBe(
    "`#save_file` and `Use #save_file for the result`."
  )
})

test("round-trips code spans containing pills, backticks, and spaces", () => {
  const source = ["``Use `literal` #save_file``", "", "`  padded  `"].join("\n")

  expect(readInstructionReferences(parse(source))).toEqual([
    { id: "save_file", kind: "tool" },
  ])
  expect(roundTrip(roundTrip(source))).toBe(roundTrip(source))
})

test("preserves user text that resembles an internal placeholder", () => {
  const source = "Keep \uE0000:0\uE001 and use #save_file."

  expect(roundTrip(source)).toBe(source)
})

test("keeps a same-line backtick run as inline code", () => {
  const document = parse("```txt hello```")
  const inlineCode = document.content?.[0]?.content?.[0]

  expect(document.content?.[0]?.type).toBe("paragraph")
  expect(inlineCode?.marks?.[0]?.type).toBe("code")
})

test.each([
  "\\# literal",
  "\\- item",
  "\\+ item",
  "1\\. item",
])("keeps the paragraph opener in %s escaped", (source) => {
  const serialized = roundTrip(source)

  expect(parse(serialized).content?.[0]?.type).toBe("paragraph")
  expect(roundTrip(serialized)).toBe(serialized)
})

test("keeps raw HTML and images literal without hydrating references", () => {
  const source = [
    '<span data-job-reference="#save_file">#save_file</span>',
    "",
    "![#save_file](https://example.com/image.png)",
  ].join("\n")
  const document = parse(source)

  expect(readInstructionReferences(document)).toEqual([])
  expect(serialize(document).description).toContain("&lt;span")
  expect(serialize(document).description).toContain("!\\[")
})

test("canonicalizes reference images without loading or losing the URL", () => {
  const source = [
    "![Preview][image]",
    "",
    '[image]: https://example.com/image.png "Preview"',
  ].join("\n")
  const serialized = roundTrip(source)

  expect(serialized).toContain("https://example.com/image.png")
  expect(roundTrip(serialized)).toBe(serialized)
})

test("uses a safe fence around nested backtick runs", () => {
  const source = ["````json", '"fence": "```"', "````"].join("\n")
  const serialized = roundTrip(source)

  expect(serialized.startsWith("````json\n")).toBe(true)
  expect(roundTrip(serialized)).toBe(serialized)
})

function parse(description: string) {
  return createJobInstructionDocument({
    catalog,
    description,
    surfaces: [],
  })
}

function serialize(document: ReturnType<typeof parse>) {
  return serializeJobInstructionDocument(document)
}

function roundTrip(description: string) {
  return serialize(parse(description)).description
}
