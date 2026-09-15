import { readArchive } from "./archive"
import { extractRtf } from "./rtf"
import { CoverageError, checkLength, type Section } from "./types"

export function extractText(
  bytes: Uint8Array,
  name: string,
  mimeType: string
): Section[] {
  const extension = name.split(".").at(-1)?.toLowerCase() ?? ""
  if (extension === "rtf" || mimeType === "application/rtf") {
    return extractRtf(bytes)
  }
  if (["docx", "xlsx", "pptx", "odt", "ods", "odp"].includes(extension)) {
    return archiveText(bytes, extension)
  }
  if (
    !(
      mimeType.startsWith("text/") ||
      /^(application\/(json|xml|javascript|x-ndjson|yaml|x-yaml))$/.test(
        mimeType
      ) ||
      [
        "txt",
        "md",
        "csv",
        "tsv",
        "json",
        "jsonl",
        "xml",
        "html",
        "htm",
        "yaml",
        "yml",
        "log",
        "js",
        "ts",
        "py",
        "css",
        "sql",
      ].includes(extension)
    )
  ) {
    throw new CoverageError(
      "unsupported",
      "This file format needs an extractor."
    )
  }
  let text = decodeText(bytes)
  const transformed =
    ["html", "htm", "xml"].includes(extension) || /(?:html|xml)/.test(mimeType)
  if (transformed) {
    text = markupText(text)
  }
  checkLength(text.length)
  return [
    {
      text,
      label: "File content",
      ...(transformed ? {} : { start: 0, end: text.length }),
    },
  ]
}

function archiveText(bytes: Uint8Array, extension: string): Section[] {
  const files = readArchive(bytes)
  if (Object.keys(files).length === 0) {
    throw new CoverageError(
      "failed",
      "The document archive contains no readable content."
    )
  }
  if (extension === "xlsx") {
    return spreadsheetText(files)
  }
  const sections: Section[] = []
  let characters = 0
  for (const [name, content] of Object.entries(files).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true })
  )) {
    const text = markupText(
      new TextDecoder("utf-8", { fatal: true }).decode(content)
    )
    characters += text.length
    checkLength(characters)
    const page = /(?:slide|sheet)(\d+)\.xml$/i.exec(name)?.[1]
    sections.push({
      text,
      label: page ? `Slide ${page}` : name,
      ...(page ? { page: Number(page) } : {}),
    })
  }
  return sections
}

export function markupText(text: string) {
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
      const point = code.toLowerCase().startsWith("x")
        ? Number.parseInt(code.slice(1), 16)
        : Number.parseInt(code, 10)
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " "
    })
    .replace(
      /&(amp|lt|gt|quot|apos|nbsp);/g,
      (_, name: string) =>
        ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[
          name
        ] ?? " "
    )
    .replace(/\s+/g, " ")
    .trim()
}

function spreadsheetText(files: Record<string, Uint8Array>): Section[] {
  const decoder = new TextDecoder("utf-8", { fatal: true })
  const shared = files["xl/sharedStrings.xml"]
  const strings =
    shared === undefined
      ? []
      : [
          ...decoder
            .decode(shared)
            .matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g),
        ].map((match) => markupText(match[1]))
  let characters = 0
  const sections: Section[] = []
  for (const [name, content] of Object.entries(files).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true })
  )) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) {
      continue
    }
    const sheet = /sheet(\d+)/.exec(name)?.[1] ?? ""
    for (const row of decoder
      .decode(content)
      .matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
      const { text, firstCell } = spreadsheetRow(row[1], strings)
      characters += text.length
      checkLength(characters)
      if (text) {
        sections.push({
          text,
          label: `Sheet ${sheet}, ${firstCell}`,
          sheet,
          ...(firstCell ? { cell: firstCell } : {}),
        })
      }
    }
  }
  return sections
}

function decodeText(bytes: Uint8Array) {
  const encoding =
    bytes[0] === 0xff && bytes[1] === 0xfe
      ? "utf-16le"
      : bytes[0] === 0xfe && bytes[1] === 0xff
        ? "utf-16be"
        : "utf-8"
  try {
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes)
    if (text.includes("\u0000")) {
      throw new Error("Binary text")
    }
    return text
  } catch {
    throw new CoverageError(
      "unsupported",
      "This file uses an unsupported or damaged text encoding."
    )
  }
}

function spreadsheetRow(source: string, strings: string[]) {
  const values: string[] = []
  let firstCell = ""
  for (const match of source.matchAll(/<c(\s[^>]*)>([\s\S]*?)<\/c>/g)) {
    const address = /\br="([^"]+)"/.exec(match[1])?.[1] ?? ""
    const type = /\bt="([^"]+)"/.exec(match[1])?.[1]
    const raw = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(match[2])?.[1]
    const value =
      type === "s"
        ? (strings[Number(raw)] ?? "")
        : type === "inlineStr"
          ? markupText(match[2])
          : markupText(raw ?? "")
    if (value) {
      firstCell ||= address
      values.push(`${address}: ${value}`)
    }
  }
  return { text: values.join("\n"), firstCell }
}
