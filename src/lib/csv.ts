// Minimal RFC 4180 CSV support: comma-separated fields, double-quote
// quoting with "" escapes, and embedded delimiters or newlines inside
// quoted fields. Small enough to own outright instead of adding a
// dependency for it.

type CsvField = {
  value: string
  next: number
  endsRecord: boolean
}

/** Parse CSV text into records of string fields. Handles LF and CRLF line
 *  endings, a leading BOM, and quoted fields; a trailing newline does not
 *  produce an empty record. Throws on an unterminated quoted field. */
export function parseCsv(text: string): string[][] {
  const source = text.startsWith("\uFEFF") ? text.slice(1) : text
  const records: string[][] = []
  let record: string[] = []
  let index = 0

  while (index < source.length) {
    const field =
      source[index] === '"'
        ? readQuotedField(source, index)
        : readBareField(source, index)

    record.push(field.value)
    index = field.next

    if (field.endsRecord) {
      records.push(record)
      record = []
    }
  }

  if (record.length > 0) {
    records.push(record)
  }

  return records
}

/** Serialize records into CSV text with a trailing newline, quoting any
 *  field holding a comma, quote, or line break. */
export function serializeCsv(records: string[][]): string {
  return records
    .map((record) => `${record.map(serializeField).join(",")}\n`)
    .join("")
}

function serializeField(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}

function readBareField(source: string, start: number): CsvField {
  let index = start

  while (
    index < source.length &&
    source[index] !== "," &&
    source[index] !== "\n" &&
    source[index] !== "\r"
  ) {
    index += 1
  }

  return {
    value: source.slice(start, index),
    ...readDelimiter(source, index),
  }
}

function readQuotedField(source: string, start: number): CsvField {
  let value = ""
  let index = start + 1

  while (index < source.length) {
    if (source[index] !== '"') {
      value += source[index]
      index += 1

      continue
    }

    if (source[index + 1] === '"') {
      value += '"'
      index += 2

      continue
    }

    return { value, ...readDelimiter(source, index + 1) }
  }

  throw new Error("Unterminated quoted value in the CSV file.")
}

/** Consume the field delimiter at `index`: a comma continues the record,
 *  while a line break or the end of input closes it. */
function readDelimiter(source: string, index: number) {
  if (source[index] === ",") {
    return { next: index + 1, endsRecord: false }
  }

  if (source[index] === "\r" && source[index + 1] === "\n") {
    return { next: index + 2, endsRecord: true }
  }

  if (source[index] === "\n" || source[index] === "\r") {
    return { next: index + 1, endsRecord: true }
  }

  return { next: index, endsRecord: index >= source.length }
}
