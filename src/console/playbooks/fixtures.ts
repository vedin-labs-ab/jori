import { vi } from "vitest"
import { type PlaybookActions } from "./enable"

/** A fully stubbed PlaybookActions for component tests. */
export function stubPlaybookActions(
  pending?: PlaybookActions["pending"]
): PlaybookActions {
  return {
    pending,
    edit: vi.fn(async () => {}),
    enable: vi.fn(async () => {}),
    openAdvanced: vi.fn(async () => {}),
    preloadEdit: vi.fn(),
    reconfigure: vi.fn(async () => {}),
    trial: vi.fn(async () => {}),
    runNow: vi.fn(async () => {}),
    setPaused: vi.fn(async () => {}),
  }
}
