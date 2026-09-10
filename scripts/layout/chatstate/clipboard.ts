import { useEffect } from "react"

/** Isolates the platform response while preserving the actual CopyButton. */
export function useClipboardResponse(state: string) {
  useEffect(() => {
    if (!state.startsWith("copy-")) {
      return
    }
    const original = navigator.clipboard.writeText
    navigator.clipboard.writeText = async () => {
      if (state === "copy-reject") {
        throw new DOMException("Fixture clipboard refusal", "NotAllowedError")
      }
    }
    return () => {
      navigator.clipboard.writeText = original
    }
  }, [state])
}
