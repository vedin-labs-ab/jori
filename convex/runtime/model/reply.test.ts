import { expect, test } from "vitest"
import { createReplyScanner, type ReplyScan } from "./reply"

const sample = 'She said "go" \\ now/then\n\ttab é 😀 done.'
const call = JSON.stringify({ text: sample, final: true })

test("every split of the arguments reads the same text, one prefix at a time", () => {
  for (let split = 0; split <= call.length; split += 1) {
    const scanner = createReplyScanner()
    const first = scanner.push(call.slice(0, split))
    const last = scanner.push(call.slice(split))

    expect(sample.startsWith(text(first))).toBe(true)
    expect(last).toEqual({ state: "done", text: sample })
  }
})

test("reads the text one character at a time", () => {
  const scanner = createReplyScanner()
  let scan: ReplyScan = { state: "open", text: "" }

  for (const char of call) {
    const next = scanner.push(char)

    expect(sample.startsWith(text(next))).toBe(true)
    expect(text(next).length).toBeGreaterThanOrEqual(text(scan).length)
    scan = next
  }

  expect(scan).toEqual({ state: "done", text: sample })
})

test("decodes every escape", () => {
  expect(
    createReplyScanner().push(
      '{"text":"a\\"b\\\\c\\/d\\be\\ff\\ng\\rh\\ti\\u00e9"}'
    )
  ).toEqual({ state: "done", text: 'a"b\\c/d\be\ff\ng\rh\tié' })
})

test("holds an unfinished escape back until it completes", () => {
  const scanner = createReplyScanner()

  expect(scanner.push('{"text":"ab\\')).toEqual({ state: "open", text: "ab" })
  expect(scanner.push("u00")).toEqual({ state: "open", text: "ab" })
  expect(scanner.push('e9"')).toEqual({ state: "done", text: "abé" })
})

test("joins a surrogate pair split across fragments and never shows half", () => {
  const scanner = createReplyScanner()

  expect(scanner.push('{"text":"\\ud83d')).toEqual({ state: "open", text: "" })
  expect(scanner.push("\\ude00")).toEqual({ state: "open", text: "😀" })
  expect(scanner.push("\ud83d")).toEqual({ state: "open", text: "😀" })
  expect(scanner.push('\ude00"')).toEqual({ state: "done", text: "😀😀" })
})

test("drops a surrogate that never finds its pair", () => {
  expect(createReplyScanner().push('{"text":"\\ud83da\\ude00b"}')).toEqual({
    state: "done",
    text: "ab",
  })
})

test("skips whitespace around the object's tokens", () => {
  expect(createReplyScanner().push(' {\n "text" : "hi" }')).toEqual({
    state: "done",
    text: "hi",
  })
})

test("reads an empty text", () => {
  expect(createReplyScanner().push('{"text":""}')).toEqual({
    state: "done",
    text: "",
  })
})

test("ignores whatever follows the closing quote", () => {
  const scanner = createReplyScanner()

  expect(scanner.push('{"text":"hi","final":true}')).toEqual({
    state: "done",
    text: "hi",
  })
  expect(scanner.push('{"text":"more"}')).toEqual({
    state: "done",
    text: "hi",
  })
})

test.each([
  ["text is not the first key", '{"final":true,"text":"x"}'],
  ["the key is something else", '{"texts":"x"}'],
  ["the arguments are not an object", '["text"]'],
  ["the value is not a string", '{"text":null}'],
  ["an escape is unknown", '{"text":"a\\x'],
  ["a unicode escape is not hex", '{"text":"a\\u00zz'],
])("abandons the draft for good when %s", (_reason, input) => {
  const scanner = createReplyScanner()

  expect(scanner.push(input)).toEqual({ state: "abandoned" })
  expect(scanner.push('{"text":"again"}')).toEqual({ state: "abandoned" })
})

function text(scan: ReplyScan) {
  return scan.state === "abandoned" ? "" : scan.text
}
