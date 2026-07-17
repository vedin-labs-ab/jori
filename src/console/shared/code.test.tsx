// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { JsonView } from "./code"

afterEach(cleanup)

const schema = {
  type: "object",
  properties: {
    scan: {
      type: "object",
      properties: { scannedAt: { type: "string" } },
      required: ["scannedAt"],
    },
    count: { type: "number" },
  },
  additionalProperties: false,
  nullable: null,
}

describe("json view", () => {
  test("expanded output matches JSON.stringify layout exactly", () => {
    const { container } = render(<JsonView value={schema} />)

    expect(container.textContent).toBe(`${JSON.stringify(schema, null, 2)}\n`)
  })

  test("collapsing a bracket folds its region and expanding restores it", () => {
    const { container } = render(<JsonView value={schema} />)

    fireEvent.click(screen.getByTitle("Collapse 3 properties"))
    expect(container.textContent).toContain('"scan": { … }')
    expect(container.textContent).not.toContain('"scannedAt"')

    fireEvent.click(screen.getByTitle("Expand 3 properties"))
    expect(container.textContent).toContain('"scannedAt": {')
  })

  test("empty composites render plain and are not collapsible", () => {
    render(<JsonView value={{ empty: {}, list: [] }} />)

    expect(screen.queryByTitle("Collapse 0 properties")).toBeNull()
    expect(screen.queryByTitle("Collapse 0 items")).toBeNull()
  })
})
