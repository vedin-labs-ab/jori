// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, expect, test, vi } from "vitest"
import { useRowSelection } from "@/shared/console/list/selection"
import { useMaterialBulk } from "./bulk"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
afterEach(() => vi.clearAllMocks())

test("an archive failure clears busy state and reports its error without per-file downloads or success", async () => {
  const download = vi.fn()
  let fail: (error: Error) => void = () => undefined
  const downloadAll = vi.fn(
    () =>
      new Promise<void>((_resolve, reject) => {
        fail = reject
      })
  )
  const { result } = renderHook(() => {
    const selection = useRowSelection({
      rows: ["one", "two"],
      identify: (row: string) => row,
    })
    return {
      selection,
      bulk: useMaterialBulk({
        selection,
        download,
        downloadAll,
        noun: { singular: "file", plural: "files" },
        remove: vi.fn(),
        removal: { success: () => "Removed", verb: "delete" },
      }),
    }
  })
  act(() => result.current.selection.toggleAll())
  act(() => result.current.bulk.downloadSelected())
  expect(result.current.bulk.isBusy).toBe(true)
  expect(downloadAll).toHaveBeenCalledExactlyOnceWith(["one", "two"])
  await act(async () => fail(new Error("Select fewer files and try again.")))
  await waitFor(() => expect(result.current.bulk.isBusy).toBe(false))
  expect(toast.error).toHaveBeenCalledWith("Select fewer files and try again.")
  expect(toast.success).not.toHaveBeenCalled()
  expect(download).not.toHaveBeenCalled()
})
