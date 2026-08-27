import { describe, expect, test } from "vitest"
import { parseCsv, serializeCsv } from "./csv"

describe("parseCsv", () => {
  test("splits records on commas and newlines", () => {
    expect(parseCsv("a,b\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })

  test("handles CRLF endings and a leading BOM", () => {
    expect(parseCsv("﻿a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })

  test("keeps empty fields and empty lines", () => {
    expect(parseCsv("a,,c\n\nd")).toEqual([["a", "", "c"], [""], ["d"]])
  })

  test("reads quoted fields with escapes, commas, and newlines", () => {
    expect(parseCsv('"a ""quoted"" field","line\nbreak",plain')).toEqual([
      ['a "quoted" field', "line\nbreak", "plain"],
    ])
  })

  test("returns no records for empty text", () => {
    expect(parseCsv("")).toEqual([])
  })

  test("throws on an unterminated quote", () => {
    expect(() => parseCsv('a,"unterminated')).toThrow("Unterminated")
  })
})

describe("serializeCsv", () => {
  test("quotes only fields that need it", () => {
    expect(
      serializeCsv([
        ["plain", "with,comma"],
        ['with "quote"', "with\nnewline"],
      ])
    ).toBe('plain,"with,comma"\n"with ""quote""","with\nnewline"\n')
  })

  test("round-trips through parseCsv", () => {
    const records = [
      ["key", "name"],
      ['odd "value"', "a,b\nc"],
      ["", "plain"],
    ]

    expect(parseCsv(serializeCsv(records))).toEqual(records)
  })
})
