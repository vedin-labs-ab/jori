import { describe, expect, test } from "vitest"
import { appendTraceLine, limitTraceLines } from "./trace"

describe("trace terminal line limits", () => {
  test("keeps stored traces bounded to the visible tail", () => {
    const lines = Array.from({ length: 2100 }, (_, index) => `line-${index}`)

    const limited = limitTraceLines(lines)

    expect(limited).toHaveLength(2000)
    expect(limited.at(0)).toBe("line-100")
    expect(limited.at(-1)).toBe("line-2099")
  })

  test("keeps live trace appends bounded", () => {
    const lines = Array.from({ length: 2000 }, (_, index) => `line-${index}`)

    const next = appendTraceLine(lines, "line-2000")

    expect(next).toHaveLength(2000)
    expect(next.at(0)).toBe("line-1")
    expect(next.at(-1)).toBe("line-2000")
  })
})
