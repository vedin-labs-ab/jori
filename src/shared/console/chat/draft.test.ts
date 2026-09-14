// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { type ReferenceView } from "../references"
import { useChatLocation } from "./draft"

afterEach(cleanup)

test("an entry suggests its containing folder and clearing it survives later resolution", () => {
  const table: ReferenceView = {
    kind: "table",
    id: "table",
    name: "Renewals",
    folderId: "finance",
  }
  const { result, rerender } = renderHook(
    ({ reference }) => useChatLocation(reference),
    { initialProps: { reference: undefined as ReferenceView | undefined } }
  )
  expect(result.current.folderId).toBeNull()
  rerender({ reference: table })
  expect(result.current.folderId).toBe("finance")
  expect(result.current.initialReference).toBe(table)
  act(() => result.current.select(null))
  rerender({ reference: { ...table, folderId: "sales" } })
  expect(result.current.folderId).toBeNull()
  expect(result.current.initialReference?.id).toBe("table")
})

test("a folder entry selects itself without inserting a redundant mention", () => {
  const { result } = renderHook(() =>
    useChatLocation({
      kind: "folder",
      id: "renewals",
      name: "Renewals",
      folderId: "finance",
    })
  )
  expect(result.current.folderId).toBe("renewals")
  expect(result.current.initialReference).toBeUndefined()
  act(() => result.current.select("sales"))
  expect(result.current.folderId).toBe("sales")
})
