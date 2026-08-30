// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import {
  allowsArrowNavigation,
  fileSiblings,
  noSiblings,
  useSiblingKeys,
} from "./siblings"

const navigate = vi.hoisted(() => vi.fn())

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}))

afterEach(() => {
  cleanup()
  navigate.mockClear()
})

const files = [{ fileId: "a" }, { fileId: "b" }, { fileId: "c" }]

describe("fileSiblings", () => {
  test("finds both neighbors of a middle file", () => {
    expect(fileSiblings(files, "b")).toEqual({
      count: 3,
      next: { fileId: "c" },
      position: 2,
      previous: { fileId: "a" },
    })
  })

  test("the first file wraps back to the last", () => {
    expect(fileSiblings(files, "a")).toEqual({
      count: 3,
      next: { fileId: "b" },
      position: 1,
      previous: { fileId: "c" },
    })
  })

  test("the last file wraps forward to the first", () => {
    expect(fileSiblings(files, "c")).toEqual({
      count: 3,
      next: { fileId: "a" },
      position: 3,
      previous: { fileId: "b" },
    })
  })

  test("a lone file has nothing to wrap to", () => {
    expect(fileSiblings([{ fileId: "a" }], "a")).toEqual({
      count: 1,
      next: null,
      position: 1,
      previous: null,
    })
  })

  test("a file missing from the list reports no position", () => {
    expect(fileSiblings(files, "z")).toEqual({
      count: 3,
      next: null,
      position: null,
      previous: null,
    })
  })

  test("an empty list yields nothing to step to", () => {
    const empty: { fileId: string }[] = []

    expect(fileSiblings(empty, "a")).toEqual({
      count: 0,
      next: null,
      position: null,
      previous: null,
    })
  })
})

function keyEvent(
  overrides: Partial<Parameters<typeof allowsArrowNavigation>[0]> = {}
) {
  return {
    altKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    metaKey: false,
    shiftKey: false,
    target: null,
    ...overrides,
  }
}

function editableTarget() {
  const element = document.createElement("div")
  Object.defineProperty(element, "isContentEditable", { value: true })

  return element
}

describe("allowsArrowNavigation", () => {
  test("allows a bare keypress on the page", () => {
    expect(allowsArrowNavigation(keyEvent())).toBe(true)
    expect(
      allowsArrowNavigation(keyEvent({ target: document.createElement("div") }))
    ).toBe(true)
    expect(
      allowsArrowNavigation(
        keyEvent({ target: document.createElement("button") })
      )
    ).toBe(true)
  })

  test("yields to modifiers and already-handled events", () => {
    expect(allowsArrowNavigation(keyEvent({ altKey: true }))).toBe(false)
    expect(allowsArrowNavigation(keyEvent({ ctrlKey: true }))).toBe(false)
    expect(allowsArrowNavigation(keyEvent({ metaKey: true }))).toBe(false)
    expect(allowsArrowNavigation(keyEvent({ shiftKey: true }))).toBe(false)
    expect(allowsArrowNavigation(keyEvent({ defaultPrevented: true }))).toBe(
      false
    )
  })

  test("yields to controls that own their arrow keys", () => {
    for (const tag of ["input", "textarea", "select", "video", "audio"]) {
      expect(
        allowsArrowNavigation(keyEvent({ target: document.createElement(tag) }))
      ).toBe(false)
    }

    expect(allowsArrowNavigation(keyEvent({ target: editableTarget() }))).toBe(
      false
    )
  })
})

function pressKey(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key }))
}

describe("useSiblingKeys", () => {
  const siblings = {
    count: 3,
    next: { fileId: "c" },
    position: 2,
    previous: { fileId: "a" },
  } as Parameters<typeof useSiblingKeys>[0]

  test("arrows navigate to the neighbors", () => {
    renderHook(() => useSiblingKeys(siblings))

    pressKey("ArrowLeft")
    pressKey("ArrowRight")

    expect(navigate.mock.calls).toEqual([
      [{ to: "/files/$fileId", params: { fileId: "a" } }],
      [{ to: "/files/$fileId", params: { fileId: "c" } }],
    ])
  })

  test("stays inert while disabled", () => {
    renderHook(() => useSiblingKeys(siblings, false))

    pressKey("ArrowLeft")

    expect(navigate).not.toHaveBeenCalled()
  })

  test("stays put with no neighbors resolved", () => {
    renderHook(() => useSiblingKeys({ ...noSiblings, count: 3 }))

    pressKey("ArrowLeft")
    pressKey("ArrowRight")

    expect(navigate).not.toHaveBeenCalled()
  })

  test("unbinds on unmount", () => {
    const { unmount } = renderHook(() => useSiblingKeys(siblings))

    unmount()
    pressKey("ArrowRight")

    expect(navigate).not.toHaveBeenCalled()
  })
})
