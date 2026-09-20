// @vitest-environment jsdom
import { act } from "@testing-library/react"
import { hydrateRoot, type Root } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { expect, test, vi } from "vitest"
import { InitialTimeContext } from "../../time"
import { UpdatedCell } from "./updated"

function row(anchor: number) {
  return (
    <InitialTimeContext value={anchor}>
      <table>
        <tbody>
          <tr>
            <UpdatedCell at={anchor - 180_000} />
          </tr>
        </tbody>
      </table>
    </InitialTimeContext>
  )
}

test("hydrates relative fixture times across clock and locale changes, then keeps ticking", async () => {
  vi.useFakeTimers()
  const serverNow = 1_700_000_039_999
  const browserNow = serverNow + 61_000
  const container = document.createElement("div")
  document.body.append(container)
  const recover = vi.fn()
  let root: Root | undefined
  try {
    vi.setSystemTime(serverNow)
    container.innerHTML = renderToString(row(serverNow))
    expect(container.textContent).toBe("3m ago")
    expect(container.querySelector("td")?.hasAttribute("title")).toBe(false)
    vi.setSystemTime(browserNow)
    const format = new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Stockholm",
    })
    const browserFormat = format.format
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (
      this: Intl.DateTimeFormat
    ) {
      return format
    })
    await act(async () => {
      root = hydrateRoot(container, row(browserNow), {
        onRecoverableError: recover,
      })
    })
    expect(recover).not.toHaveBeenCalled()
    expect(container.textContent).toBe("3m ago")
    expect(container.querySelector("td")?.title).toBe(
      browserFormat(browserNow - 180_000)
    )
    act(() => vi.advanceTimersByTime(60_000))
    expect(container.textContent).toBe("4m ago")
  } finally {
    act(() => root?.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.useRealTimers()
  }
})
