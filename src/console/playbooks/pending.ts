import { useState } from "react"

export type PlaybookActionKind =
  | "enable"
  | "trial"
  | "run"
  | "pause"
  | "edit"
  | "reconfigure"
  | "advanced"

export type PendingAction = ReturnType<typeof usePendingAction>

/** One in-flight action per playbook card; `wrap` serializes and reports. */
export function usePendingAction() {
  const [current, setCurrent] = useState<{
    key: string
    kind: PlaybookActionKind
  }>()

  async function wrap(
    key: string,
    kind: PlaybookActionKind,
    action: () => Promise<void>
  ) {
    setCurrent({ key, kind })
    try {
      await action()
    } finally {
      setCurrent(undefined)
    }
  }

  return { current, wrap }
}
