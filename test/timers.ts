import { act } from "@testing-library/react"
import { vi } from "vitest"

/** Drive scheduled callbacks until the requested UI state arrives.
 *  Fake time advances to each callback; no wall-clock delay is involved. */
export async function advanceUntil(ready: () => boolean) {
  while (!ready()) {
    if (vi.getTimerCount() === 0) {
      throw new Error("No scheduled callbacks remain before the expected state")
    }
    await act(() => vi.advanceTimersToNextTimerAsync())
  }
}
