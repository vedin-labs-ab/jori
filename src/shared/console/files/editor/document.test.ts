// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type FileDetail } from "@/shared/console/files/types"
import { documentDeadline, useDocument } from "./document"

const fetchMock = vi.fn()
let fileCounter = 0

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockImplementation(async () => new Response("file text"))
  URL.createObjectURL = vi.fn(() => {
    fileCounter += 1

    return `blob:doc-${fileCounter}`
  })
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function fileOf(): FileDetail {
  fileCounter += 1

  return {
    fileId: `text-${fileCounter}`,
    size: 9,
    updatedAt: 1000,
    url: `https://storage.example/text-${fileCounter}`,
  } as FileDetail
}

test("loads the text once and reports it ready", async () => {
  const file = fileOf()

  const { result } = renderHook(() => useDocument(file, file.url ?? ""))

  expect(result.current.state.status).toBe("loading")

  await act(async () => {})

  expect(result.current.state).toEqual({
    saved: "file text",
    seed: "file text",
    status: "ready",
  })
})

test("text past the deadline reports an error instead of spinning", async () => {
  let settle: (response: Response) => void = () => undefined
  fetchMock.mockImplementationOnce(
    () => new Promise<Response>((resolve) => (settle = resolve))
  )
  const file = fileOf()

  const { result } = renderHook(() => useDocument(file, file.url ?? ""))

  await act(async () => {
    vi.advanceTimersByTime(documentDeadline)
  })

  expect(result.current.state.status).toBe("error")

  // A late arrival still opens the editor — content beats the notice.
  await act(async () => {
    settle(new Response("late text"))
  })

  expect(result.current.state.status).toBe("ready")
})

test("a failed fetch reports an error without waiting for the deadline", async () => {
  fetchMock.mockImplementationOnce(
    async () => new Response(null, { status: 500 })
  )
  const file = fileOf()

  const { result } = renderHook(() => useDocument(file, file.url ?? ""))

  await act(async () => {})

  expect(result.current.state.status).toBe("error")
})

test("unmounting mid-load cancels the deadline", () => {
  fetchMock.mockImplementationOnce(() => new Promise<Response>(() => undefined))
  const file = fileOf()

  const { unmount } = renderHook(() => useDocument(file, file.url ?? ""))

  expect(vi.getTimerCount()).toBe(1)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})
